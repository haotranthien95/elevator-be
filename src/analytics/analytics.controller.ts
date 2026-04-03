import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AnalyticsService } from './analytics.service';
import { AnalyticsQueryDto } from './dto/analytics-query.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('analytics/admin')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('summary')
  async getSummary(@Query() query: AnalyticsQueryDto) {
    return {
      success: true,
      data: await this.analyticsService.getSummary(query),
    };
  }

  @Get('trends')
  async getTrends(@Query() query: AnalyticsQueryDto) {
    return {
      success: true,
      data: await this.analyticsService.getTrends(query),
    };
  }

  @Get('technicians')
  async getTechnicians(@Query() query: AnalyticsQueryDto) {
    return {
      success: true,
      data: await this.analyticsService.getTechnicians(query),
    };
  }

  @Get('buildings')
  async getBuildings(@Query() query: AnalyticsQueryDto) {
    return {
      success: true,
      data: await this.analyticsService.getBuildings(query),
    };
  }
}
