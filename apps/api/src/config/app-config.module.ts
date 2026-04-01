import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtConfigService } from './jwt.config';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [JwtConfigService],
  exports: [JwtConfigService],
})
export class AppConfigModule {}
