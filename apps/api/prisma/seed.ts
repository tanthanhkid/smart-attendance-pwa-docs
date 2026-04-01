import { PrismaClient, UserRole, AttendanceStatus } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

const DEFAULT_SEED_COUNTS = {
  branchCount: 5,
  employeeCount: 50,
} as const;

const BRANCH_TEMPLATES = [
  {
    code: 'HCM001',
    name: 'Smart Attendance HQ',
    address: '123 Nguyen Hue, Q1, HCMC',
    lat: 10.7712,
    lng: 106.698,
    radius: 100,
  },
  {
    code: 'HCM002',
    name: 'District 7 Branch',
    address: '456 Nguyen Van Linh, Q7, HCMC',
    lat: 10.7417,
    lng: 106.7227,
    radius: 120,
  },
  {
    code: 'DN001',
    name: 'Da Nang Office',
    address: '78 Bach Dang, Da Nang',
    lat: 16.0544,
    lng: 108.2022,
    radius: 100,
  },
  {
    code: 'HN001',
    name: 'Hanoi Office',
    address: '1 Thanh Nhan, Hanoi',
    lat: 21.0285,
    lng: 105.8542,
    radius: 100,
  },
  {
    code: 'CT001',
    name: 'Can Tho Branch',
    address: '99 Nguyen Van Cu, Can Tho',
    lat: 10.0452,
    lng: 105.7469,
    radius: 100,
  },
] as const;

const DEPARTMENT_NAMES = ['Engineering', 'Sales', 'HR', 'Finance'] as const;

export interface SeedConfig {
  branchCount: number;
  employeeCount: number;
}

export function resolveSeedCount(
  rawValue: string | undefined,
  fallback: number,
  minimum: number,
): number {
  const parsed = rawValue ? Number.parseInt(rawValue, 10) : Number.NaN;
  if (!Number.isFinite(parsed) || parsed < minimum) {
    return fallback;
  }

  return parsed;
}

export function getSeedConfig(env: NodeJS.ProcessEnv = process.env): SeedConfig {
  return {
    branchCount: resolveSeedCount(env.SEED_BRANCH_COUNT, DEFAULT_SEED_COUNTS.branchCount, 1),
    employeeCount: resolveSeedCount(env.SEED_EMPLOYEE_COUNT, DEFAULT_SEED_COUNTS.employeeCount, 0),
  };
}

export function buildBranchData(branchCount: number) {
  return Array.from({ length: branchCount }, (_, index) => {
    const template = BRANCH_TEMPLATES[index % BRANCH_TEMPLATES.length];
    const batchNumber = Math.floor(index / BRANCH_TEMPLATES.length);
    const sequence = index + 1;
    const codePrefix = template.code.replace(/\d+$/, '');
    const code =
      batchNumber === 0 ? template.code : `${codePrefix}${String(sequence).padStart(3, '0')}`;
    const name = batchNumber === 0 ? template.name : `${template.name} ${batchNumber + 1}`;

    return {
      code,
      name,
      address: batchNumber === 0 ? template.address : `${template.address} (${batchNumber + 1})`,
      lat: template.lat,
      lng: template.lng,
      radius: template.radius,
    };
  });
}

async function main() {
  const { branchCount, employeeCount } = getSeedConfig();

  console.log('🌱 Starting seed data...');

  await prisma.auditLog.deleteMany();
  await prisma.attendanceFlag.deleteMany();
  await prisma.attendanceEvent.deleteMany();
  await prisma.attendanceSession.deleteMany();
  await prisma.approvalRequest.deleteMany();
  await prisma.deviceRegistration.deleteMany();
  await prisma.branchWifiConfig.deleteMany();
  await prisma.branchGeofence.deleteMany();
  await prisma.shiftTemplate.deleteMany();
  await prisma.department.deleteMany();
  await prisma.user.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.branch.deleteMany();

  console.log('✅ Cleaned existing data');

  const adminPasswordHash = await hash('admin123', 10);
  await prisma.user.create({
    data: {
      email: 'admin@smart-attendance.com',
      passwordHash: adminPasswordHash,
      role: UserRole.ADMIN,
    },
  });
  console.log('✅ Created admin user: admin@smart-attendance.com / admin123');

  const branchData = buildBranchData(branchCount);
  const branches = [];
  for (const branchSeed of branchData) {
    const branch = await prisma.branch.create({
      data: {
        code: branchSeed.code,
        name: branchSeed.name,
        address: branchSeed.address,
        latitude: branchSeed.lat,
        longitude: branchSeed.lng,
        geofence: {
          create: {
            centerLat: branchSeed.lat,
            centerLng: branchSeed.lng,
            radiusMeters: branchSeed.radius,
          },
        },
      },
      include: { geofence: true },
    });
    branches.push(branch);

    for (const deptName of DEPARTMENT_NAMES) {
      await prisma.department.create({
        data: {
          branchId: branch.id,
          name: deptName,
          code: `${branch.code}-${deptName.toUpperCase().slice(0, 3)}`,
        },
      });
    }
  }
  console.log(`✅ Created ${branches.length} branches with departments`);

  const shifts = [
    { name: 'Morning Shift', startMinuteOfDay: 8 * 60, endMinuteOfDay: 17 * 60, lateGraceMinutes: 10 },
    { name: 'Afternoon Shift', startMinuteOfDay: 13 * 60, endMinuteOfDay: 21 * 60, lateGraceMinutes: 10 },
    { name: 'Night Shift', startMinuteOfDay: 21 * 60, endMinuteOfDay: 6 * 60, lateGraceMinutes: 10 },
  ];

  for (const shift of shifts) {
    await prisma.shiftTemplate.create({ data: shift });
  }
  console.log('✅ Created shift templates');

  const managerPasswordHash = await hash('manager123', 10);
  const branchManagerByBranchId = new Map<string, string>();
  for (let i = 0; i < branches.length; i++) {
    const manager = await prisma.user.create({
      data: {
        email: `manager${i + 1}@smart-attendance.com`,
        passwordHash: managerPasswordHash,
        role: UserRole.MANAGER,
        employee: {
          create: {
            employeeCode: `MGR${String(i + 1).padStart(4, '0')}`,
            fullName: `Manager ${i + 1}`,
            branchId: branches[i].id,
          },
        },
      },
    });
    branchManagerByBranchId.set(branches[i].id, manager.id);
  }
  console.log(`✅ Created ${branches.length} manager users`);

  const employeePasswordHash = await hash('employee123', 10);
  const departments = await prisma.department.findMany();
  const demoAttendanceEmployees = Math.min(employeeCount, 30);

  let createdEmployees = 0;
  for (let i = 0; i < employeeCount; i++) {
    const branch = branches[i % branches.length];
    const dept = departments.find((department) => department.branchId === branch.id) || departments[0];

    const user = await prisma.user.create({
      data: {
        email: `employee${i + 1}@smart-attendance.com`,
        passwordHash: employeePasswordHash,
        role: UserRole.EMPLOYEE,
        employee: {
          create: {
            employeeCode: `EMP${String(i + 1).padStart(5, '0')}`,
            fullName: `Employee ${i + 1}`,
            phone: `090${String(Math.floor(Math.random() * 9000000 + 1000000))}`,
            branchId: branch.id,
            departmentId: dept.id,
            managerUserId: branchManagerByBranchId.get(branch.id) ?? null,
          },
        },
      },
      include: { employee: true },
    });
    createdEmployees++;

    if (user.employee && i < demoAttendanceEmployees) {
      for (let day = 30; day >= 1; day--) {
        const workDate = new Date();
        workDate.setDate(workDate.getDate() - day);
        workDate.setHours(0, 0, 0, 0);

        if (workDate.getDay() === 0 || workDate.getDay() === 6) continue;

        if (Math.random() > 0.1) {
          const checkInHour = 7 + Math.floor(Math.random() * 3);
          const checkOutHour = 17 + Math.floor(Math.random() * 3);

          const checkInAt = new Date(workDate);
          checkInAt.setHours(checkInHour, Math.floor(Math.random() * 60), 0, 0);

          const checkOutAt = new Date(workDate);
          checkOutAt.setHours(checkOutHour, Math.floor(Math.random() * 60), 0, 0);

          const totalMinutes = Math.round((checkOutAt.getTime() - checkInAt.getTime()) / 60000);
          const isLate = checkInHour >= 9;
          const isFlagged = Math.random() < 0.05;
          const riskScore = isFlagged ? Math.floor(Math.random() * 30 + 20) : Math.floor(Math.random() * 15);

          const session = await prisma.attendanceSession.create({
            data: {
              employeeId: user.employee.id,
              branchId: branch.id,
              workDate,
              status: isLate ? AttendanceStatus.LATE : AttendanceStatus.ON_TIME,
              checkInAt,
              checkOutAt,
              totalMinutes,
              overtimeMinutes: Math.max(0, totalMinutes - 480),
              riskScore,
              isFlagged,
            },
          });

          await prisma.attendanceEvent.create({
            data: {
              attendanceSessionId: session.id,
              employeeId: user.employee.id,
              branchId: branch.id,
              type: 'CHECK_IN',
              occurredAt: checkInAt,
              latitude: branch.latitude || branch.geofence.centerLat,
              longitude: branch.longitude || branch.geofence.centerLng,
              accuracyMeters: 10 + Math.random() * 20,
              distanceMeters: Math.random() * 50,
              decision: isFlagged ? 'ALLOW_WITH_FLAG' : 'ALLOW',
            },
          });

          await prisma.attendanceEvent.create({
            data: {
              attendanceSessionId: session.id,
              employeeId: user.employee.id,
              branchId: branch.id,
              type: 'CHECK_OUT',
              occurredAt: checkOutAt,
              latitude: branch.latitude || branch.geofence.centerLat,
              longitude: branch.longitude || branch.geofence.centerLng,
              accuracyMeters: 10 + Math.random() * 20,
              distanceMeters: Math.random() * 50,
              decision: 'ALLOW',
            },
          });

          if (isFlagged) {
            await prisma.attendanceFlag.create({
              data: {
                attendanceSessionId: session.id,
                code: 'EDGE_GEOFENCE',
                message: 'Location near boundary of geofence area',
                severity: 'LOW',
              },
            });
          }
        }
      }
    }
  }
  console.log(`✅ Created ${createdEmployees} employees with attendance history`);
}

if (require.main === module) {
  void main()
    .catch((error) => {
      console.error('❌ Seed failed:', error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
      console.log('🏁 Seed completed!');
    });
}
