export declare class AssignScriptDto {
    scriptId: string;
    customGoal?: string;
}
export declare class BulkCallDto {
    businessIds: string[];
    overrideScriptId?: string;
    overrideGoal?: string;
    concurrent?: boolean;
}
export interface BusinessWithScript {
    id: string;
    name: string;
    phoneNumber: string | null;
    email: string | null;
    industry: string | null;
    callStatus: string;
    callCount: number;
    lastCalled: Date | null;
    assignedScript: {
        id: string;
        name: string;
        goal: string;
        description: string | null;
    } | null;
    customGoal: string | null;
}
