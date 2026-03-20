// ============================================================
// Settings Controller — Must-IQ API
// Admin-only endpoints to read and update the active LLM
// GET  /api/v1/settings/llm  → current settings
// PUT  /api/v1/settings/llm  → update provider/model
// GET  /api/v1/settings/llm/providers → available providers + models
// ============================================================

import {
  Controller, Get, Put, Body, UseGuards, Req,
  ForbiddenException, HttpCode, HttpStatus,
} from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import {
  getActiveSettings,
  saveActiveSettings,
  getSystemSettings,
  saveSystemSettings,
  PROVIDER_MODELS,
  EMBEDDING_MODELS,
  LLMProvider,
  EmbeddingProvider,
} from "@must-iq/config";

import { UpdateLLMSettingsDto } from "./dto/settings.dto";

@Controller("settings")
@UseGuards(AuthGuard)
export class SettingsController {

  // -----------------------------------------------------------
  // GET /api/v1/settings/llm
  // Returns current active settings (no API keys)
  // -----------------------------------------------------------
  @Get("llm")
  async getLLMSettings() {
    const settings = await getActiveSettings();

    // Mask API keys for front-end management
    const maskedApiKeys = Array.isArray(settings.apiKeys)
      ? settings.apiKeys.map(k => ({
        ...k,
        key: k.key ? `${k.key.slice(0, 6)}...${k.key.slice(-4)}` : ""
      }))
      : [];

    return {
      ...settings,
      apiKeys: maskedApiKeys
    };
  }

  // -----------------------------------------------------------
  // PUT /api/v1/settings/llm
  // Update active model — ADMIN only
  // -----------------------------------------------------------
  @Put("llm")
  @HttpCode(HttpStatus.OK)
  async updateLLMSettings(
    @Body() body: any, // Allow flexible updates for multi-key array
    @Req() req: any
  ) {
    if (req.user.role !== "ADMIN") {
      throw new ForbiddenException("Only ADMIN users can change LLM settings");
    }

    await saveActiveSettings(body);

    return { message: "Settings updated" };
  }

  // -----------------------------------------------------------
  // GET /api/v1/settings/llm/providers
  // Returns all available providers + their models
  // Used to populate the settings UI dropdowns
  // -----------------------------------------------------------
  @Get("llm/providers")
  getAvailableProviders() {
    return {
      providers: PROVIDER_MODELS,
      embeddingProviders: EMBEDDING_MODELS,
    };
  }

  // -----------------------------------------------------------
  // GET /api/v1/settings/system
  // Returns current system settings
  // -----------------------------------------------------------
  @Get("system")
  async getSystemSettings() {
    return await getSystemSettings();
  }

  // -----------------------------------------------------------
  // PUT /api/v1/settings/system
  // Update system settings — ADMIN only
  // -----------------------------------------------------------
  @Put("system")
  @HttpCode(HttpStatus.OK)
  async updateSystemSettings(
    @Body() body: any,
    @Req() req: any
  ) {
    if (req.user.role !== "ADMIN") {
      throw new ForbiddenException("Only ADMIN users can change system settings");
    }

    await saveSystemSettings(body);
    return { message: "System settings updated" };
  }
}
