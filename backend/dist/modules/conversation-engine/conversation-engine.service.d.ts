import { ConfigService } from '@nestjs/config';
export declare class ConversationEngineService {
    private readonly configService;
    private readonly logger;
    constructor(configService: ConfigService);
}
