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

  @Get("llm")
  async getLLMSettings() {
    const settings = await getActiveSettings();

    // Mask API keys for front-end display
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

  @Put("llm")
  @HttpCode(HttpStatus.OK)
  async updateLLMSettings(
    @Body() body: any,
    @Req() req: any
  ) {
    if (req.user.role !== "ADMIN") {
      throw new ForbiddenException("Only ADMIN users can change LLM settings");
    }

    await saveActiveSettings(body);

    return { message: "Settings updated" };
  }

  @Get("llm/providers")
  getAvailableProviders() {
    return {
      providers: PROVIDER_MODELS,
      embeddingProviders: EMBEDDING_MODELS,
    };
  }

  @Get("system")
  async getSystemSettings() {
    return await getSystemSettings();
  }

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
