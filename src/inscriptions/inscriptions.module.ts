import { mkdirSync } from 'node:fs';
import { Module } from '@nestjs/common';
import { DELAI_IDENTITE_MS, clientHttp } from './clients/identite.client.js';
import { InscriptionsController } from './controllers/inscriptions.controller.js';
import { DepotSqlite } from './repositories/depot-sqlite.js';
import { InscriptionsService } from './services/inscriptions.service.js';

@Module({
  controllers: [InscriptionsController],
  providers: [
    {
      provide: DepotSqlite,
      useFactory: () => {
        mkdirSync('data', { recursive: true });
        const depot = new DepotSqlite('data/inscriptions.sqlite');
        depot.assurerSchema();
        depot.assurerReferentiel();
        return depot;
      },
    },
    {
      provide: InscriptionsService,
      inject: [DepotSqlite],
      useFactory: (depot: DepotSqlite) =>
        new InscriptionsService(
          depot,
          clientHttp(process.env.IDENTITE_URL ?? 'http://localhost:4000'),
          () => new Date(),
          DELAI_IDENTITE_MS,
        ),
    },
  ],
})
export class InscriptionsModule {}
