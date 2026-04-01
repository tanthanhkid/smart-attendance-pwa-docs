import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AppConfigModule } from './config';
import { PrismaModule } from './common';
import { AuthModule } from './modules/auth';
import { BranchesModule } from './modules/branches';
import { EmployeesModule } from './modules/employees';
import { AttendanceModule } from './modules/attendance';
import { DashboardModule } from './modules/dashboard';
import { ApprovalsModule } from './modules/approvals';
import { ReportsModule } from './modules/reports';
import { AuditModule } from './modules/audit';
import { JwtAuthGuard } from './common';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
    }),
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 60000,
        limit: 10,
      },
      {
        name: 'long',
        ttl: 600000,
        limit: 100,
      },
    ]),
    AppConfigModule,
    PrismaModule,
    AuthModule,
    BranchesModule,
    EmployeesModule,
    AttendanceModule,
    DashboardModule,
    ApprovalsModule,
    ReportsModule,
    AuditModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
