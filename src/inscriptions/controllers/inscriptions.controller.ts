import { Body, Controller, Post } from '@nestjs/common';
import { CreerInscriptionDto } from '../dto/creer-inscription.dto.js';
import { InscriptionsService } from '../services/inscriptions.service.js';

@Controller('api')
export class InscriptionsController {
  constructor(private readonly inscriptionsService: InscriptionsService) {}

  @Post('inscriptions')
  creer(@Body() dto: CreerInscriptionDto) {
    return this.inscriptionsService.creer(dto);
  }
}
