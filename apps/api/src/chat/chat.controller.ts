// ============================================================
// Chat Controller
// POST /api/v1/chat — Main chat endpoint
// GET  /api/v1/chat/sessions — List user's sessions
// ============================================================

import {
  Controller, Post, Get, Body, Param,
  UseGuards, Req, Res, HttpCode, HttpStatus,
} from "@nestjs/common";
import { Response, Request } from "express";
import { AuthGuard } from "../auth/auth.guard";
import { ChatService } from "./chat.service";
import { ChatRequest } from "@must-iq/shared-types";
import { PaginationOptionsDto } from "../common/dto/pagination.dto";
import { Query } from "@nestjs/common";

@Controller("chat")
@UseGuards(AuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) { }

  // -------------------------------------------------------------------
  // POST /api/v1/chat
  // Send a message. Supports streaming (SSE) or JSON response.
  // -------------------------------------------------------------------
  @Post()
  @HttpCode(HttpStatus.OK)
  async chat(
    @Body() body: ChatRequest,
    @Req() req: Request,
    @Res() res: Response
  ) {
    const user = (req as any).user;

    if (body.stream) {
      // Server-Sent Events for streaming response
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      await this.chatService.streamChat(body, user, (chunk: string) => {
        res.write(`data: ${chunk}\n\n`);
      });

      res.write(`data: [DONE]\n\n`);
      res.end();
    } else {
      const result = await this.chatService.chat(body, user);
      res.json(result);
    }
  }

  // -------------------------------------------------------------------
  // GET /api/v1/chat/sessions
  // Return all sessions for the logged-in user
  // -------------------------------------------------------------------
  // -------------------------------------------------------------------
  @Get("sessions")
  async getSessions(
    @Req() req: Request,
    @Query() query: PaginationOptionsDto
  ) {
    const user = (req as any).user;
    return this.chatService.getSessions(user.sub, query);
  }

  // -------------------------------------------------------------------
  // GET /api/v1/chat/sessions/:id
  // Return a specific session with all messages
  // -------------------------------------------------------------------
  @Get("sessions/:id")
  async getSession(@Param("id") id: string, @Req() req: Request) {
    const user = (req as any).user;
    return this.chatService.getSession(id, user.sub);
  }

  @Get("teams")
  async getTeams(@Req() req: Request) {
    const user = (req as any).user;
    return this.chatService.getAuthorizedTeams(user.sub, user.role);
  }
}
