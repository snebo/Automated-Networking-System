import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('conversation-engine')
@Controller('conversation')
export class ConversationEngineController {
  // All test endpoints removed - service operates via events only
}