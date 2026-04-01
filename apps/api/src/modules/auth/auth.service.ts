import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import { JwtConfigService } from '@/config';
import { PrismaService, ERROR_MESSAGES } from '@/common';
import { LoginDto, AuthResponseDto } from './dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private jwtConfig: JwtConfigService,
  ) {}

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: {
        employee: {
          include: {
            branch: true,
            department: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException(ERROR_MESSAGES.AUTH.INVALID_CREDENTIALS);
    }

    if (!user.isActive) {
      throw new UnauthorizedException(ERROR_MESSAGES.AUTH.ACCOUNT_INACTIVE);
    }

    const isPasswordValid = await compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException(ERROR_MESSAGES.AUTH.INVALID_CREDENTIALS);
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role, user.employeeId ?? undefined);

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        employeeId: user.employeeId,
        employee: user.employee
          ? {
              id: user.employee.id,
              employeeCode: user.employee.employeeCode,
              fullName: user.employee.fullName,
              branchId: user.employee.branchId,
              branchName: user.employee.branch.name,
              departmentId: user.employee.departmentId,
              departmentName: user.employee.department?.name ?? null,
            }
          : null,
      },
    };
  }

  async refreshToken(refreshToken: string): Promise<{ accessToken: string; expiresIn: number }> {
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.jwtConfig.refreshSecret,
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedException(ERROR_MESSAGES.AUTH.USER_INACTIVE);
      }

      const accessToken = await this.jwtService.signAsync(
        {
          sub: user.id,
          email: user.email,
          role: user.role,
          employeeId: user.employeeId,
        },
        {
          secret: this.jwtConfig.accessSecret,
          expiresIn: this.jwtConfig.accessExpiresIn,
        },
      );

      return {
        accessToken,
        expiresIn: this.parseExpiresIn(this.jwtConfig.accessExpiresIn),
      };
    } catch (error) {
      throw new UnauthorizedException(ERROR_MESSAGES.AUTH.INVALID_REFRESH_TOKEN, { cause: error });
    }
  }

  async logout(refreshToken: string): Promise<{ message: string }> {
    return { message: 'Logout successful' };
  }

  async hashPassword(password: string): Promise<string> {
    return hash(password, 10);
  }

  private async generateTokens(
    userId: string,
    email: string,
    role: string,
    employeeId?: string,
  ): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        { sub: userId, email, role, employeeId },
        { secret: this.jwtConfig.accessSecret, expiresIn: this.jwtConfig.accessExpiresIn },
      ),
      this.jwtService.signAsync(
        { sub: userId, email },
        { secret: this.jwtConfig.refreshSecret, expiresIn: this.jwtConfig.refreshExpiresIn },
      ),
    ]);

    return {
      accessToken,
      refreshToken,
      expiresIn: this.parseExpiresIn(this.jwtConfig.accessExpiresIn),
    };
  }

  private parseExpiresIn(expiresIn: string): number {
    const match = expiresIn.match(/^(\d+)([mhd])$/);
    if (!match) return 900;

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 'm':
        return value * 60;
      case 'h':
        return value * 3600;
      case 'd':
        return value * 86400;
      default:
        return 900;
    }
  }
}
