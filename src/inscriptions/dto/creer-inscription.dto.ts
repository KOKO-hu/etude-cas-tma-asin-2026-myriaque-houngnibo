import {
  IsNotEmpty,
  IsString,
  Matches,
  Validate,
  ValidatorConstraint,
  type ValidatorConstraintInterface,
} from 'class-validator';
import { MESSAGE_INSCRIPTION } from '../constants/messages.js';
import { dateCalendrierValide } from '../domain/regles.js';

@ValidatorConstraint({ name: 'dateCalendrier', async: false })
export class DateCalendrierConstraint implements ValidatorConstraintInterface {
  validate(valeur: unknown): boolean {
    return dateCalendrierValide(valeur);
  }

  defaultMessage(): string {
    return MESSAGE_INSCRIPTION.DATE;
  }
}

export class CreerInscriptionDto {
  @IsString()
  @Matches(/^\d{10}$/, { message: MESSAGE_INSCRIPTION.NPI })
  npi: string;

  @IsString()
  @Validate(DateCalendrierConstraint)
  dateNaissance: string;

  @IsString()
  @IsNotEmpty({ message: MESSAGE_INSCRIPTION.CONCOURS_CENTRE })
  concours: string;

  @IsString()
  @IsNotEmpty({ message: MESSAGE_INSCRIPTION.CONCOURS_CENTRE })
  centre: string;
}
