# PROMPT: Bổ sung AI Slop Detection Module cho Control Center

## CONTEXT

Đọc file tài liệu Control Center Technical Specification đã có trong project. Control Center hiện có: State Manager, CR System, Dependency Graph, Impact Analyzer, CLAUDE.md Generator, Production Readiness.

Module mới này giải quyết vấn đề: **AI-generated code trông đúng, test pass, nhưng chứa các pattern nguy hiểm đặc trưng của AI** mà con người sẽ không bao giờ viết. Gọi chung là "AI Slop" — code có vẻ professional nhưng thực chất shallow, thiếu depth, và sẽ gây bugs trên production.

Khác biệt với Production Readiness: Production Readiness kiểm tra "service có đủ thành phần để chạy production không" (health check tồn tại, env vars documented, rate limit configured). AI Slop Check kiểm tra "code bên trong mỗi file có thực sự đúng hay chỉ trông đúng".

Khác biệt với Unit Test: Unit test kiểm tra "function trả về đúng output cho input X". AI Slop Check kiểm tra "function có pattern nào sẽ gây lỗi mà unit test không cover".

---

## AI SLOP PATTERNS CẦN DETECT

Implement scanner cho TẤT CẢ patterns dưới đây. Mỗi pattern có: ID, tên, mô tả, severity (critical/high/medium/low), cách detect (regex hoặc AST pattern), ví dụ bad code, ví dụ correct code.

---

### Category 1: Fake Error Handling

AI rất hay viết try-catch trông professional nhưng thực chất nuốt lỗi hoặc xử lý sai.

#### SLOP-001: Empty Catch Block
- **Severity:** critical
- **Mô tả:** catch block rỗng hoặc chỉ có comment. Lỗi bị nuốt hoàn toàn, không log, không throw, không return error.
- **Detect:** Regex tìm `catch` block mà body chỉ chứa whitespace, comment, hoặc không có statement nào.
- **Pattern regex:** `catch\s*\([^)]*\)\s*\{[\s//*]*\}` và `catch\s*\([^)]*\)\s*\{\s*\/\/.*\s*\}`
- **Bad:**
```typescript
try {
  await this.prisma.user.create({ data });
} catch (err) {
  // TODO: handle later
}
```
- **Good:**
```typescript
try {
  await this.prisma.user.create({ data });
} catch (err) {
  this.logger.error('Failed to create user', { error: err.message, stack: err.stack, correlationId });
  throw new InternalServerErrorException('User creation failed');
}
```

#### SLOP-002: Catch-Log-Swallow
- **Severity:** high
- **Mô tả:** catch block log lỗi nhưng KHÔNG throw lại và KHÔNG return error. Caller nghĩ operation thành công nhưng thực ra đã fail. Đây là pattern AI hay tạo nhất.
- **Detect:** catch block có `console.log/logger.error/logger.warn` nhưng KHÔNG có `throw`, `return`, hoặc `reject` sau đó.
- **Bad:**
```typescript
async publishEvent(event) {
  try {
    await this.rabbit.publish('exchange', event);
  } catch (err) {
    this.logger.error('Failed to publish event', err);
    // ← Function returns undefined, caller thinks event was published
  }
}
```
- **Good:**
```typescript
async publishEvent(event) {
  try {
    await this.rabbit.publish('exchange', event);
  } catch (err) {
    this.logger.error('Failed to publish event', err);
    throw err; // ← Caller knows it failed
  }
}
```

#### SLOP-003: Generic Catch-All Returns Null
- **Severity:** high
- **Mô tả:** Function catch mọi exception rồi return null/undefined/empty array. Caller phải check null nhưng thường không check vì type system nói return type không nullable.
- **Detect:** catch block có `return null`, `return undefined`, `return []`, `return {}` mà không kèm throw.
- **Bad:**
```typescript
async findUser(id: string): Promise<User> {
  try {
    return await this.prisma.user.findUniqueOrThrow({ where: { id } });
  } catch (err) {
    return null; // ← Return type says User, not User | null
  }
}
```

#### SLOP-004: Re-throwing Without Context
- **Severity:** medium
- **Mô tả:** catch rồi throw lại error MỚI mà không kèm original error. Stack trace và error message gốc bị mất, debug rất khó.
- **Detect:** catch block có `throw new Error(...)` hoặc `throw new HttpException(...)` mà không reference biến error từ catch.
- **Bad:**
```typescript
catch (err) {
  throw new InternalServerErrorException('Something went wrong');
  // ← Original error lost, cannot debug
}
```
- **Good:**
```typescript
catch (err) {
  this.logger.error('User creation failed', { originalError: err.message, stack: err.stack });
  throw new InternalServerErrorException('User creation failed');
}
```

---

### Category 2: Async/Await Traps

AI hay viết async code trông đúng nhưng có subtle bugs.

#### SLOP-010: Fire-and-Forget Async
- **Severity:** critical
- **Mô tả:** Gọi async function mà không await. Function chạy ở background, nếu fail sẽ thành unhandled rejection. Rất hay xảy ra với event publishing, notification sending, logging.
- **Detect:** Tìm call đến async function (function có keyword `async` hoặc return Promise) mà không có `await` phía trước. Cũng detect: gọi `.then()` mà không có `.catch()`.
- **Bad:**
```typescript
async register(dto) {
  const user = await this.prisma.user.create({ data });
  this.eventService.publishUserCreated(user); // ← Thiếu await!
  this.emailService.sendWelcome(user.email);  // ← Thiếu await!
  return user;
}
```
- **Good:**
```typescript
async register(dto) {
  const user = await this.prisma.user.create({ data });
  await this.eventService.publishUserCreated(user);
  await this.emailService.sendWelcome(user.email);
  return user;
}
```

#### SLOP-011: Await Inside Loop Without Batching
- **Severity:** high
- **Mô tả:** await bên trong for/forEach/map loop. Mỗi iteration chờ iteration trước xong → O(n) sequential thay vì O(1) parallel. Với 100 items, chậm 100x.
- **Detect:** `await` bên trong `for`, `for...of`, `while`, hoặc `.forEach()`, `.map()` callback.
- **Bad:**
```typescript
for (const item of items) {
  await this.prisma.orderItem.create({ data: item }); // ← 100 items = 100 DB calls sequential
}
```
- **Good:**
```typescript
// Option A: Parallel
await Promise.all(items.map(item =>
  this.prisma.orderItem.create({ data: item })
));

// Option B: Batch (tốt hơn cho DB)
await this.prisma.orderItem.createMany({ data: items });
```

#### SLOP-012: Promise.all Without Error Handling
- **Severity:** high
- **Mô tả:** Promise.all mà không handle case 1 promise fail. Khi 1 fail, tất cả bị reject, kể cả những cái đã thành công. Partial failure không được handle.
- **Detect:** `Promise.all(` mà không nằm trong try-catch, hoặc không dùng `Promise.allSettled`.
- **Bad:**
```typescript
const [user, orders, notifications] = await Promise.all([
  this.userService.getUser(id),
  this.orderService.getOrders(id),
  this.notificationService.getNotifications(id),
]);
// ← Nếu notification service chết, user và orders cũng bị mất
```

#### SLOP-013: Async Function Without Await
- **Severity:** medium
- **Mô tả:** Function declared `async` nhưng không có `await` bên trong. Có thể quên await, hoặc function không cần async.
- **Detect:** Function có keyword `async` mà body không chứa `await`.

---

### Category 3: Data & Type Traps

AI viết code TypeScript nhưng hay bypass type system.

#### SLOP-020: Type Assertion Instead of Validation
- **Severity:** critical
- **Mô tả:** Dùng `as Type` để ép kiểu thay vì validate data thật. Data từ external source (API, DB, MQ message) KHÔNG được trust — phải validate.
- **Detect:** Tìm `as <Type>` pattern, đặc biệt khi applied lên: `JSON.parse()`, `req.body`, `req.params`, `req.query`, message payload, hoặc any.
- **Bad:**
```typescript
const payload = JSON.parse(message.content) as UserCreatedEvent;
// ← Nếu publisher gửi sai format, code crash ở chỗ khác với error khó hiểu
```
- **Good:**
```typescript
const raw = JSON.parse(message.content);
const payload = UserCreatedEventSchema.parse(raw);
// ← Fail ngay tại đây với clear validation error
```

#### SLOP-021: Any Type Usage
- **Severity:** high
- **Mô tả:** Dùng `any` type. Vô hiệu hóa toàn bộ type checking cho variable đó và mọi thứ derive từ nó.
- **Detect:** Tìm `: any`, `as any`, `<any>` trong code (trừ trong file .d.ts declaration).
- **Pattern:** `: any` hoặc `as any` không nằm trong comment.

#### SLOP-022: Non-null Assertion Operator
- **Severity:** medium
- **Mô tả:** Dùng `!` postfix operator (non-null assertion). Nói với TypeScript "tôi chắc chắn giá trị này không null" — nhưng AI không thực sự chắc chắn, nó chỉ muốn compiler không complain.
- **Detect:** Tìm pattern `variable!.` hoặc `expression!.` (dấu ! trước dấu .)
- **Bad:**
```typescript
const user = await this.prisma.user.findUnique({ where: { id } });
return user!.email; // ← Crash nếu user null
```
- **Good:**
```typescript
const user = await this.prisma.user.findUnique({ where: { id } });
if (!user) throw new NotFoundException('User not found');
return user.email;
```

#### SLOP-023: Enum/Magic String Scattered
- **Severity:** medium
- **Mô tả:** Cùng 1 string value (status, type, role) xuất hiện ở nhiều files dưới dạng string literal thay vì constant/enum. Đổi 1 chỗ quên chỗ kia.
- **Detect:** Tìm string literals giống nhau xuất hiện >= 3 lần across different files, đặc biệt: status values, event names, queue names, error messages.

---

### Category 4: Security Anti-Patterns

AI hay tạo code có vẻ secure nhưng có lỗ hổng.

#### SLOP-030: Secrets in Source Code
- **Severity:** critical
- **Mô tả:** Password, API key, secret key, connection string hardcode trong source code.
- **Detect:** Regex patterns:
  - `password\s*[:=]\s*['"][^'"]+['"]` (không phải trong .env.example)
  - `secret\s*[:=]\s*['"][^'"]+['"]`
  - `api[_-]?key\s*[:=]\s*['"][^'"]+['"]`
  - `Bearer [A-Za-z0-9-._~+/]+=*` (hardcoded JWT)
  - `postgresql://[^:]+:[^@]+@` (connection string with password)
  - Các pattern base64 dài > 20 ký tự gán cho biến có tên chứa "secret", "key", "token"

#### SLOP-031: SQL/NoSQL Injection via String Concatenation
- **Severity:** critical
- **Mô tả:** Dù dùng Prisma (safe by default), AI đôi khi viết raw queries với string concatenation.
- **Detect:** Tìm `$queryRaw`, `$executeRaw` kèm template literal có `${variable}` thay vì Prisma placeholder `${Prisma.sql}`. Tìm cả `query(` với string concatenation.

#### SLOP-032: Overly Permissive CORS
- **Severity:** high
- **Mô tả:** CORS config cho phép mọi origin.
- **Detect:** Tìm `origin: '*'`, `origin: true`, `cors({ origin: '*' })`, `Access-Control-Allow-Origin: *`

#### SLOP-033: Sensitive Data in Logs/Responses
- **Severity:** high
- **Mô tả:** Log hoặc return trong response: password, token, full credit card, SSN, plain email trong error messages.
- **Detect:** Tìm log statements (`logger.`, `console.`) mà arguments chứa: `password`, `token`, `secret`, `authorization`, `.body` (log toàn bộ request body). Tìm error responses chứa `stack`, `password`, `token`.
- **Bad:**
```typescript
this.logger.error('Login failed', { email, password, attempt });
// ← password trong log
```
- **Bad:**
```typescript
catch (err) {
  return { error: err.message, stack: err.stack };
  // ← Stack trace trong API response
}
```

#### SLOP-034: JWT Without Expiry Validation
- **Severity:** high
- **Mô tả:** JWT verify mà không check expiry, hoặc sign mà không set expiry.
- **Detect:** Tìm `jwt.sign(` mà options không có `expiresIn`. Tìm `jwt.verify(` mà options có `ignoreExpiration: true`.

---

### Category 5: Performance Anti-Patterns

AI code thường chạy đúng nhưng chậm hoặc tốn resource.

#### SLOP-040: N+1 Query
- **Severity:** high
- **Mô tả:** Query 1 lần để lấy list, rồi loop qua list query thêm cho mỗi item. Với 100 items = 101 queries thay vì 1-2 queries.
- **Detect:** Tìm pattern: Prisma `findMany` followed by loop chứa `findUnique`/`findFirst`/`findMany`. Tìm: `for`/`map`/`forEach` chứa `await prisma.` bên trong.
- **Bad:**
```typescript
const orders = await this.prisma.order.findMany();
for (const order of orders) {
  order.user = await this.prisma.user.findUnique({
    where: { id: order.userId }
  }); // ← 100 orders = 100 extra queries
}
```
- **Good:**
```typescript
const orders = await this.prisma.order.findMany({
  include: { user: true } // ← 1 query with JOIN
});
```

#### SLOP-041: Unbounded Query
- **Severity:** high
- **Mô tả:** Query lấy TẤT CẢ records không có limit. Với bảng 1 triệu rows, response sẽ rất lớn và chậm.
- **Detect:** `findMany()` hoặc `findMany({ where: ... })` mà KHÔNG có `take`/`limit` parameter. Trừ khi nằm trong migration hoặc seed script.
- **Bad:**
```typescript
const users = await this.prisma.user.findMany();
```
- **Good:**
```typescript
const users = await this.prisma.user.findMany({
  take: 20,
  skip: (page - 1) * 20,
});
```

#### SLOP-042: Missing Database Index Hint
- **Severity:** medium
- **Mô tả:** Query filter hoặc sort trên field mà Prisma schema không có `@@index`. Sẽ full table scan.
- **Detect:** So sánh `where` conditions trong code với `@@index` declarations trong schema.prisma. Nếu field được filter/sort mà không có index → warning.

#### SLOP-043: Large Payload Without Pagination
- **Severity:** medium
- **Mô tả:** API endpoint trả về array mà không support pagination (skip/take/cursor params).
- **Detect:** Controller method trả về array type mà route không accept query params `page`, `limit`, `skip`, `take`, hoặc `cursor`.

---

### Category 6: Logic Smells

Pattern cho thấy AI không thực sự hiểu business logic.

#### SLOP-050: Copy-Paste Code Between Services
- **Severity:** high
- **Mô tả:** AI implement service B bằng cách copy code từ service A rồi sửa tên. Dẫn đến duplicate logic, sửa 1 chỗ quên chỗ kia.
- **Detect:** So sánh files giữa các services. Nếu 2 files có > 70% similarity (bỏ qua tên biến) → flag. Dùng simple approach: normalize variable names rồi compare line-by-line.

#### SLOP-051: TODO/FIXME/HACK Comments Left Behind
- **Severity:** medium
- **Mô tả:** AI hay để lại TODO comments mà quên implement. Hoặc viết HACK/FIXME mà không ai quay lại fix.
- **Detect:** Regex tìm `// TODO`, `// FIXME`, `// HACK`, `// XXX`, `// TEMPORARY`, `// WORKAROUND` trong source files (trừ test files).

#### SLOP-052: Console.log Left Behind
- **Severity:** medium
- **Mô tả:** AI dùng console.log để debug rồi quên xóa. Trên production sẽ spam logs không có structured format.
- **Detect:** Tìm `console.log(`, `console.warn(`, `console.error(`, `console.debug(` trong source files (trừ test files và scripts).

#### SLOP-053: Commented-Out Code
- **Severity:** low
- **Mô tả:** AI hay comment out code cũ thay vì xóa. Gây confuse khi đọc code — không biết code đó còn relevant không.
- **Detect:** Tìm blocks comment liên tiếp (>= 3 dòng `//`) mà content looks like code (chứa `=`, `(`, `{`, `return`, `if`, `const`, `let`).

#### SLOP-054: Identical Error Messages
- **Severity:** medium
- **Mô tả:** Nhiều endpoints throw cùng 1 error message. Khi lỗi xảy ra không biết lỗi từ endpoint nào.
- **Detect:** Tìm string trong `throw new` statements. Nếu cùng 1 message string xuất hiện > 1 lần across different functions → flag.

---

### Category 7: Test Quality Smells

Kiểm tra xem tests có thực sự test đúng thứ hay chỉ "test cho có".

#### SLOP-060: Test Without Assertion
- **Severity:** critical
- **Mô tả:** Test function chạy code nhưng không có assertion. Test luôn pass vì không check gì.
- **Detect:** Test function (`it(`, `test(`) mà body không chứa `expect(`, `assert`, `.should`, `toBe`, `toEqual`, `toThrow`, `rejects`.
- **Bad:**
```typescript
it('should create user', async () => {
  await service.register(dto);
  // ← Không expect gì cả, test pass ngay cả khi register trả về garbage
});
```

#### SLOP-061: Always-True Assertion
- **Severity:** high
- **Mô tả:** Assertion luôn true, không phụ thuộc vào code under test.
- **Detect:** Tìm patterns: `expect(true).toBe(true)`, `expect(1).toBe(1)`, `expect(result).toBeDefined()` (quá lỏng — hầu như mọi thứ trừ undefined đều pass), `expect(result).toBeTruthy()` (0, "", null fail nhưng mọi thứ khác pass).

#### SLOP-062: Test Chỉ Test Happy Path
- **Severity:** high
- **Mô tả:** AI viết 5 tests cho 1 function, cả 5 đều test case input hợp lệ. Không test: input rỗng, null, sai format, duplicate, unauthorized, conflict.
- **Detect:** Trong 1 describe block, đếm test cases. Nếu KHÔNG có test nào có `expect(...).rejects` hoặc `expect(...).toThrow` hoặc check status code >= 400 → flag "no error case tests".

#### SLOP-063: Mock Everything
- **Severity:** medium
- **Mô tả:** Integration test mock quá nhiều dependencies, test không còn test gì thật. Đặc biệt: mock DB trong integration test (lẽ ra integration test phải dùng real DB).
- **Detect:** Trong e2e test files, tìm `jest.mock`, `jest.spyOn(...).mockReturnValue`, hoặc nhiều `useValue: { ... }` mock objects. Nếu > 3 mocks trong 1 integration test → flag.

---

## CLI COMMANDS

Thêm các commands sau vào cc.mjs:

### Scan 1 service
```
cc.mjs slop scan <service-id>
```
Chạy tất cả slop checks cho 1 service. Output:
```
🔍 AI Slop Scan: user-service
══════════════════════════════

CRITICAL (must fix):
  SLOP-001  src/users/users.service.ts:45     Empty catch block
  SLOP-010  src/users/users.service.ts:78     Fire-and-forget async: publishUserCreated()
  SLOP-030  src/config/database.ts:3          Hardcoded password in connection string

HIGH (should fix):
  SLOP-002  src/users/auth.service.ts:23      Catch-log-swallow in validateToken()
  SLOP-011  src/orders/orders.service.ts:56   Await in loop: 'for...of' with prisma.create
  SLOP-040  src/orders/orders.service.ts:89   Potential N+1: findMany → loop findUnique
  SLOP-060  src/users/tests/register.spec.ts:34  Test without assertion

MEDIUM (nice to fix):
  SLOP-051  src/users/users.service.ts:12     TODO comment: "// TODO: handle later"
  SLOP-052  src/users/users.controller.ts:67  console.log left behind

Summary: 3 critical, 4 high, 2 medium, 0 low
Score: 43/100 (FAIL — critical issues must be resolved)
```

### Scan toàn bộ project
```
cc.mjs slop scan-all
```
Chạy scan cho tất cả services, output summary table.

### Scan 1 file cụ thể
```
cc.mjs slop scan-file <file-path>
```
Scan 1 file cụ thể. Hữu ích khi vừa implement xong 1 TODO và muốn check ngay.

### Xem chi tiết 1 pattern
```
cc.mjs slop explain SLOP-001
```
In ra: mô tả đầy đủ, severity, bad code example, good code example, cách fix.

### Ignore false positive
```
cc.mjs slop ignore <service-id> <slop-id> <file:line> "reason"
```
Đánh dấu 1 finding là false positive với lý do. Lần scan sau sẽ không report lại.
```
cc.mjs slop ignore user-service SLOP-011 "src/seed.ts:23" "Seed script, performance not important"
```

### Report tổng hợp
```
cc.mjs slop report
```
Output:
- Tổng findings by severity across all services
- Top 5 patterns xuất hiện nhiều nhất (systemic issues)
- Trend: so sánh với lần scan trước (better/worse)
- Per-service scores

---

## DATA MODEL

Thêm vào Service schema trong state.json:

```json
{
  "slopCheck": {
    "lastScanAt": "ISO 8601 | null",
    "score": 0,
    "findings": [
      {
        "id": "SLOP-001",
        "file": "src/users/users.service.ts",
        "line": 45,
        "severity": "critical",
        "message": "Empty catch block",
        "snippet": "} catch (err) { }",
        "status": "open | ignored | fixed",
        "ignoredReason": "string | null"
      }
    ],
    "summary": {
      "critical": 0,
      "high": 0,
      "medium": 0,
      "low": 0
    },
    "history": [
      {
        "scanAt": "ISO 8601",
        "score": 0,
        "critical": 0,
        "high": 0,
        "medium": 0,
        "low": 0
      }
    ]
  }
}
```

---

## TÍCH HỢP VỚI CONTROL CENTER

### Tích hợp với workflow
Sau khi Claude Code implement 1 TODO và tests pass, TRƯỚC KHI mark done:
```
cc.mjs start user-service TODO-2
# ... implement ...
# ... tests pass ...
cc.mjs slop scan-file src/users/users.service.ts    ← NEW
cc.mjs slop scan-file src/users/users.controller.ts ← NEW
# Fix critical/high issues
cc.mjs done user-service TODO-2
```

### Tích hợp với CLAUDE.md generator
Khi generate CLAUDE.md, thêm section:
- Nếu service có critical slop findings → warning block
- Liệt kê top 3 patterns cần chú ý
- Nhắc Claude Code: "Sau khi implement, chạy cc.mjs slop scan-file cho mỗi file đã tạo/sửa"

### Tích hợp với Production Readiness gate
`cc.mjs readiness gate <service>` phải FAIL nếu slop scan có findings ở mức critical. High findings là warning nhưng không block gate (có thể cấu hình).

### Tích hợp với cc-test.sh
Thêm slop scan vào test runner script (cc-test.sh) như 1 step:
```
Step 1/5: TypeScript Check
Step 2/5: ESLint
Step 3/5: Unit Tests
Step 4/5: Integration Tests
Step 5/5: AI Slop Scan        ← NEW
```

---

## SCORING

Mỗi service có slop score 0-100:
- Start at 100
- Mỗi critical finding: -15 points
- Mỗi high finding: -8 points
- Mỗi medium finding: -3 points
- Mỗi low finding: -1 point
- Minimum: 0

Thresholds:
- 90-100: Excellent — production quality
- 70-89: Good — acceptable, should fix highs
- 50-69: Needs Work — must fix criticals and highs
- 0-49: Poor — not deployable

---

## IMPLEMENTATION NOTES

### Technology
- Scanner PHẢI viết bằng pure Node.js, KHÔNG dùng external dependencies
- Dùng regex cho phần lớn pattern detection. KHÔNG cần full AST parser — regex đủ chính xác cho mục đích này
- Đọc files bằng fs.readFileSync, split by newline, scan từng line
- Một số patterns cần context nhiều dòng (ví dụ catch block) → dùng simple state machine: khi gặp `catch`, track brace depth cho đến hết block

### Scan performance
- Scan 1 service nên chạy < 5 giây
- Skip: node_modules, dist, build, .git, coverage, *.d.ts files
- Chỉ scan: .ts, .js, .mjs files trong src/ và tests/

### False positive management
- Một số patterns sẽ có false positive. Ví dụ: SLOP-013 (async without await) sẽ flag controller methods vì NestJS handles promise automatically
- Cho phép inline ignore: nếu dòng code có comment `// slop-ignore SLOP-xxx` thì skip finding đó
- Cho phép file-level ignore: nếu file có comment `// slop-ignore-file` ở dòng đầu thì skip toàn bộ file
- Centralized ignore list trong state.json (via `cc.mjs slop ignore` command)

### Output format
- Terminal output dùng ANSI colors: critical=red, high=yellow, medium=cyan, low=gray
- Mỗi finding hiển thị: file:line, snippet (max 80 chars), message
- Summary ở cuối với score

---

## IMPLEMENTATION ORDER

1. Define all pattern constants (ID, name, severity, regex/detect function)
2. Build file scanner (read file, split lines, apply patterns)
3. Build multi-line pattern scanner (state machine for catch blocks, loops, etc.)
4. Build `cc.mjs slop scan-file <path>` command
5. Build `cc.mjs slop scan <service>` command (scan all files in service)
6. Build `cc.mjs slop scan-all` command
7. Build `cc.mjs slop explain <id>` command
8. Build `cc.mjs slop ignore` command
9. Build `cc.mjs slop report` command
10. Build scoring system
11. Integrate with state.json (save findings per service)
12. Integrate with CLAUDE.md generator
13. Integrate with cc-test.sh
14. Integrate with readiness gate

Sau khi implement xong, test bằng cách tạo 1 file test chứa intentionally bad code (mỗi pattern 1 instance) và verify scanner detect đúng tất cả.
