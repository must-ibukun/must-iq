import {
    Controller,
    Get,
    Post,
    Body,
    Query,
    UseGuards,
    Req,
    HttpCode,
    HttpStatus,
    ForbiddenException,
    Param,
    Delete,
    Patch,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { AuthGuard } from '../auth/auth.guard';
import { InviteUserDto } from './dto/admin.dto';
import { PaginationOptionsDto } from '../common/dto/pagination.dto';

import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { AuthenticatedRequest } from '../common/interfaces/auth.interface';

@Controller('admin')
@UseGuards(AuthGuard, RolesGuard)
export class AdminController {
    constructor(private readonly adminService: AdminService) { }

    @Get('stats')
    @Roles('ADMIN', 'MANAGER')
    getStats(@Req() req: AuthenticatedRequest) {
        return this.adminService.getStats(req.user as any);
    }

    @Get('users')
    @Roles('ADMIN', 'MANAGER')
    getUsers(@Query() query: PaginationOptionsDto, @Req() req: AuthenticatedRequest) {
        return this.adminService.getUsers(query, req.user as any);
    }

    @Post('users/invite')
    @HttpCode(HttpStatus.CREATED)
    @Roles('ADMIN', 'MANAGER')
    inviteUser(@Body() body: InviteUserDto) {
        return this.adminService.inviteUser(body);
    }

    @Roles('ADMIN', 'MANAGER')
    @HttpCode(HttpStatus.OK)
    @Patch('users/:id')
    updateUser(@Param('id') id: string, @Body() body: any) {
        return this.adminService.updateUser(id, body);
    }

    @Roles('ADMIN', 'MANAGER')
    @HttpCode(HttpStatus.OK)
    @Post('users/:id/teams')
    updateUserTeams(@Param('id') id: string, @Body() body: { teamIds: string[] }, @Req() req: AuthenticatedRequest) {
        return this.adminService.updateUserTeams(id, body.teamIds, req.user as any);
    }

    @Get('tokens/usage')
    @Roles('ADMIN', 'MANAGER')
    getTokenUsage(@Req() req: AuthenticatedRequest) {
        return this.adminService.getTokenUsage(req.user as any);
    }

    @Get('audit')
    @Roles('ADMIN', 'MANAGER')
    getAuditLog(@Query() query: PaginationOptionsDto, @Req() req: AuthenticatedRequest) {
        return this.adminService.getAuditLog(query, req.user as any);
    }

    @Get('workspaces/grouped')
    @Roles('ADMIN', 'MANAGER')
    getWorkspacesGrouped(@Req() req: AuthenticatedRequest) {
        return this.adminService.getWorkspacesGrouped(req.user as any);
    }

    @Get('workspaces/available')
    @Roles('ADMIN', 'MANAGER')
    getAvailableWorkspaces(@Req() req: AuthenticatedRequest) {
        return this.adminService.getAvailableWorkspaces(req.user as any);
    }

    @Get('workspaces')
    @Roles('ADMIN', 'MANAGER')
    getWorkspaces(@Query() query: PaginationOptionsDto, @Req() req: AuthenticatedRequest) {
        return this.adminService.getWorkspaces(query, req.user as any);
    }

    @Post('workspaces')
    @Roles('ADMIN')
    @HttpCode(HttpStatus.CREATED)
    createWorkspace(@Body() body: any) {
        return this.adminService.createWorkspace(body);
    }

    @Patch('workspaces/:id')
    @Roles('ADMIN')
    @HttpCode(HttpStatus.OK)
    updateWorkspace(@Param('id') id: string, @Body() body: any) {
        return this.adminService.updateWorkspace(id, body);
    }

    @Delete('workspaces/:id')
    @Roles('ADMIN')
    @HttpCode(HttpStatus.OK)
    deleteWorkspace(@Param('id') id: string) {
        return this.adminService.deleteWorkspace(id);
    }

    @Post('workspaces/sync')
    @Roles('ADMIN')
    bulkSyncWorkspaces(@Body() body: any) {
        return this.adminService.bulkSyncWorkspaces(body.items);
    }


    @Get('teams')
    @Roles('ADMIN', 'MANAGER')
    getTeams(@Query() query: PaginationOptionsDto, @Req() req: AuthenticatedRequest) {
        return this.adminService.getTeams(query, req.user as any);
    }

    @Post('teams')
    @HttpCode(HttpStatus.CREATED)
    @Roles('ADMIN', 'MANAGER')
    createTeam(@Body() body: any, @Req() req: AuthenticatedRequest) {
        return this.adminService.createTeam(body, req.user.sub);
    }

    @Get('discovery')
    @Roles('ADMIN', 'MANAGER')
    discoverWorkspaces() {
        return this.adminService.discoverWorkspaces();
    }

    @Post('teams/:id/sync')
    @Roles('ADMIN', 'MANAGER')
    syncTeam(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
        return this.adminService.syncTeamData(id, req.user as any);
    }

    @Patch('teams/:id')
    @Roles('ADMIN', 'MANAGER')
    @HttpCode(HttpStatus.OK)
    updateTeam(@Param('id') id: string, @Body() body: any, @Req() req: AuthenticatedRequest) {
        return this.adminService.updateTeam(id, body, req.user.sub);
    }
    @Delete('teams/:id')
    @Roles('ADMIN')
    deleteTeam(@Param('id') id: string) {
        return this.adminService.deleteTeam(id);
    }

    @Get('docs')
    @Roles('ADMIN')
    getDocs() {
        return this.adminService.getDocs();
    }

    @Get('docs/:filename')
    @Roles('ADMIN')
    getDocContent(@Param('filename') filename: string) {
        return this.adminService.getDocContent(filename);
    }
}
