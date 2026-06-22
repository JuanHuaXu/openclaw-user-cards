import type { OpenClawPluginApi } from "openclaw/plugin-sdk/plugin-entry";
type UserCardsConfig = {
    storePath?: string;
    databasePath?: string;
    autoLearn?: boolean;
    inject?: boolean;
    maxNotes?: number;
    maxCardChars?: number;
    maxRosterNames?: number;
    maxRecallEvents?: number;
    includeDisplayName?: boolean;
    privateAliases?: string[];
    passiveDiscordLogTail?: PassiveDiscordLogTailConfig;
    passiveDiscordGateway?: PassiveDiscordGatewayConfig;
    passiveIMessageWatch?: PassiveIMessageWatchConfig;
    llmSummarization?: LlmSummarizationConfig;
    daemonSummarization?: DaemonSummarizationConfig;
    libravdbProjection?: LibravDBProjectionConfig;
};
type PassiveDiscordLogTailConfig = {
    enabled?: boolean;
    logPath?: string;
    openclawConfigPath?: string;
    pollMs?: number;
};
type PassiveDiscordGatewayConfig = {
    enabled?: boolean;
    openclawConfigPath?: string;
    captureMessages?: boolean;
    captureGuildMembers?: boolean;
    maxCapturedMessages?: number;
    maxMessageChars?: number;
};
type PassiveIMessageWatchConfig = {
    enabled?: boolean;
    commandPath?: string;
    captureMessages?: boolean;
    includeSelfMessages?: boolean;
    maxCapturedMessages?: number;
    maxMessageChars?: number;
};
type LlmSummarizationConfig = {
    enabled?: boolean;
    endpoint?: string;
    model?: string;
    timeoutMs?: number;
    maxInputChars?: number;
    maxNotesPerMessage?: number;
    numCtx?: number;
    keepAlive?: string | number | false;
    fallbackToPatterns?: boolean;
};
type DaemonSummarizationConfig = {
    enabled?: boolean;
    endpoint?: string;
    timeoutMs?: number;
    maxOutputTokens?: number;
};
type LibravDBProjectionConfig = {
    enabled?: boolean;
    endpoint?: string;
    tenantKey?: string;
    pushCapturedMessages?: boolean;
    timeoutMs?: number;
    retryDelayMs?: number;
    maxAttempts?: number;
};
type CapturedMessage = {
    at: string;
    text: string;
    messageId?: string;
};
type EventNote = {
    event_uuid: string;
    event_signal_strength: number;
    event_what: string;
    event_when: number;
    event_why: string[];
    event_how: string;
};
type DaemonSummarizeMessages = (params: {
    endpoint: string;
    timeoutMs: number;
    messages: Array<{
        role: string;
        content: string;
    }>;
    maxOutputTokens: number;
}) => Promise<{
    summaryText?: string;
}>;
type LibravDBIngestMessage = (params: {
    endpoint: string;
    timeoutMs: number;
    sessionId: string;
    sessionKey: string;
    userId: string;
    role: string;
    content: string;
    id: string;
}) => Promise<{
    ok?: boolean;
    ingested?: number;
}>;
type LibravDBProjectionQueueItem = {
    id: string;
    kind: string;
    sourceId: string;
    cardKey: string;
    sessionId: string;
    sessionKey: string;
    role: string;
    content: string;
    attemptCount: number;
};
type SpeakerCard = {
    key: string;
    visibleNames: string[];
    speakerKind?: SpeakerKind;
    notes: EventNote[];
    recentMessages?: CapturedMessage[];
    firstSeenAt: string;
    lastSeenAt: string;
    messageCount: number;
};
type SpeakerKind = "human" | "agent" | "unknown";
type StoreFile = {
    version: 1;
    cards: Record<string, SpeakerCard>;
};
type LegacySpeakerCard = Omit<SpeakerCard, "notes"> & {
    notes?: Array<string | EventNote>;
};
type LegacyStoreFile = {
    version?: number;
    cards?: Record<string, LegacySpeakerCard>;
};
type SpeakerEnvelope = {
    key: string;
    visibleName?: string;
    capturedMessage?: CapturedMessage;
    isAutomated?: boolean;
    runId?: string;
    sessionKey?: string;
};
type DiscordInboundLogHit = {
    messageId: string;
    channelId: string;
};
type StoreMutation = (store: StoreFile) => void;
declare class UserCardStore {
    private readonly databasePath;
    private readonly legacyJsonPath?;
    private loaded?;
    private db?;
    private queue;
    constructor(databasePath: string, legacyJsonPath?: string | undefined);
    getCard(key: string): Promise<SpeakerCard | undefined>;
    listCards(): Promise<SpeakerCard[]>;
    mutate(mutator: StoreMutation): Promise<void>;
    private load;
    private refresh;
    private openDatabase;
    enqueueLibravDBProjection(item: Omit<LibravDBProjectionQueueItem, "attemptCount">): Promise<void>;
    claimLibravDBProjectionBatch(limit: number): Promise<LibravDBProjectionQueueItem[]>;
    completeLibravDBProjection(id: string): Promise<void>;
    failLibravDBProjection(params: {
        id: string;
        error: string;
        attemptCount: number;
        maxAttempts: number;
        retryDelayMs: number;
    }): Promise<void>;
    private loadLegacyJson;
    private readFromDatabase;
    private withMutationLock;
    private save;
}
declare function shouldStartPassiveRuntimes(api: Pick<OpenClawPluginApi, "registrationMode">): boolean;
declare function normalizeStoreFile(input: LegacyStoreFile): StoreFile;
declare function normalizeEventSignalStrength(value: unknown, eventHow?: unknown): number;
declare function extractEnvelope(event: unknown, ctx: unknown): SpeakerEnvelope | undefined;
declare function extractDiscordInboundLogHit(line: string): DiscordInboundLogHit | undefined;
declare function extractDiscordTokenFromOpenClawConfig(config: unknown): string | undefined;
declare function extractDiscordGatewayAuthorEnvelope(event: unknown): SpeakerEnvelope | undefined;
declare function extractDiscordGatewayMentionEnvelopes(event: unknown): SpeakerEnvelope[];
declare function extractDiscordGatewayGuildMemberEnvelopes(event: unknown): SpeakerEnvelope[];
declare function isDiscordGatewayAgentDirected(event: unknown, botUserId: string | undefined): boolean;
declare function extractDiscordGatewayMessageEnvelope(event: unknown, cfg: Required<UserCardsConfig>): SpeakerEnvelope | undefined;
declare function parseIMessageWatchLine(value: string): unknown | undefined;
declare function extractIMessageWatchEnvelope(event: unknown, cfg: Required<UserCardsConfig>): SpeakerEnvelope | undefined;
declare function isIMessageWatchAgentDirected(event: unknown): boolean;
declare function neutralizeControlSyntax(text: string): string;
declare function isInstructionLikeMemoryText(text: string): boolean;
declare function extractLearnedNotes(content: unknown): EventNote[];
declare function extractWeakLearnedNotes(content: unknown): EventNote[];
declare function extractLearnedNotesWithLlm(content: unknown, cfg: Required<UserCardsConfig>, logger?: OpenClawPluginApi["logger"]): Promise<EventNote[]>;
declare function hasMemorySignal(text: string): boolean;
declare function summarizeLearnedNotesWithDaemon(text: string, cfg: Required<UserCardsConfig>, logger?: OpenClawPluginApi["logger"]): Promise<EventNote[] | undefined>;
declare function sanitizeDaemonSummary(value: unknown): string | undefined;
declare function parseLlmEventNotes(content: string | undefined, limit: number, sourceText?: string): EventNote[] | undefined;
declare function sanitizeNote(value: unknown): string | undefined;
declare function touchSpeakerIdentity(params: {
    store: StoreFile;
    envelope: SpeakerEnvelope;
}): void;
declare function addCapturedMessageToCard(params: {
    store: StoreFile;
    key: string;
    message: CapturedMessage | undefined;
    maxCapturedMessages: number;
}): void;
declare function addNotesToCard(params: {
    store: StoreFile;
    key: string;
    notes: EventNote[];
    maxNotes: number;
}): void;
declare function createNoteScheduler(params: {
    cfg: Required<UserCardsConfig>;
    store: UserCardStore;
    logger?: OpenClawPluginApi["logger"];
    retryDelayMs?: number;
}): (envelope: SpeakerEnvelope, content: unknown) => void;
declare function createLibravDBProjectionScheduler(params: {
    cfg: Required<UserCardsConfig>;
    store: UserCardStore;
    logger?: OpenClawPluginApi["logger"];
}): (envelope: SpeakerEnvelope, agentDirected: boolean) => void;
declare function createCapturedMessageProjectionItem(envelope: SpeakerEnvelope, agentDirected: boolean): Omit<LibravDBProjectionQueueItem, "attemptCount"> | undefined;
declare function isPrivateAlias(value: string, privateAliases: string[]): boolean;
declare function currentUserPromptText(eventRecord: Record<string, unknown>): string | undefined;
declare function renderCard(card: SpeakerCard, cfg: Required<UserCardsConfig>, options?: {
    includePingToken?: boolean;
}): string | undefined;
declare function renderChannelRoster(params: {
    cards: SpeakerCard[];
    currentKey?: string;
    promptText?: string;
    cfg: Required<UserCardsConfig>;
}): string | undefined;
declare function renderMatchingEvents(params: {
    cards: SpeakerCard[];
    currentKey?: string;
    promptText?: string;
    cfg: Required<UserCardsConfig>;
    now?: number;
}): string | undefined;
declare function selectRecallEventMatches<T extends {
    note: EventNote;
    score: number;
}>(matches: T[], limit: number): T[];
export declare const internals: {
    UserCardStore: typeof UserCardStore;
    extractEnvelope: typeof extractEnvelope;
    extractDiscordInboundLogHit: typeof extractDiscordInboundLogHit;
    extractDiscordGatewayAuthorEnvelope: typeof extractDiscordGatewayAuthorEnvelope;
    extractDiscordGatewayMentionEnvelopes: typeof extractDiscordGatewayMentionEnvelopes;
    extractDiscordGatewayGuildMemberEnvelopes: typeof extractDiscordGatewayGuildMemberEnvelopes;
    extractDiscordGatewayMessageEnvelope: typeof extractDiscordGatewayMessageEnvelope;
    extractDiscordTokenFromOpenClawConfig: typeof extractDiscordTokenFromOpenClawConfig;
    extractIMessageWatchEnvelope: typeof extractIMessageWatchEnvelope;
    parseIMessageWatchLine: typeof parseIMessageWatchLine;
    extractLearnedNotes: typeof extractLearnedNotes;
    extractWeakLearnedNotes: typeof extractWeakLearnedNotes;
    extractLearnedNotesWithLlm: typeof extractLearnedNotesWithLlm;
    summarizeLearnedNotesWithDaemon: typeof summarizeLearnedNotesWithDaemon;
    sanitizeDaemonSummary: typeof sanitizeDaemonSummary;
    normalizeEventSignalStrength: typeof normalizeEventSignalStrength;
    selectRecallEventMatches: typeof selectRecallEventMatches;
    setDaemonSummarizeMessagesForTest(fn: DaemonSummarizeMessages): () => void;
    setLibravDBIngestMessageForTest(fn: LibravDBIngestMessage): () => void;
    createNoteScheduler: typeof createNoteScheduler;
    createLibravDBProjectionScheduler: typeof createLibravDBProjectionScheduler;
    createCapturedMessageProjectionItem: typeof createCapturedMessageProjectionItem;
    addNotesToCard: typeof addNotesToCard;
    addCapturedMessageToCard: typeof addCapturedMessageToCard;
    isDiscordGatewayAgentDirected: typeof isDiscordGatewayAgentDirected;
    isIMessageWatchAgentDirected: typeof isIMessageWatchAgentDirected;
    hasMemorySignal: typeof hasMemorySignal;
    parseLlmEventNotes: typeof parseLlmEventNotes;
    normalizeStoreFile: typeof normalizeStoreFile;
    neutralizeControlSyntax: typeof neutralizeControlSyntax;
    isInstructionLikeMemoryText: typeof isInstructionLikeMemoryText;
    shouldStartPassiveRuntimes: typeof shouldStartPassiveRuntimes;
    renderCard: typeof renderCard;
    renderChannelRoster: typeof renderChannelRoster;
    renderMatchingEvents: typeof renderMatchingEvents;
    currentUserPromptText: typeof currentUserPromptText;
    sanitizeNote: typeof sanitizeNote;
    touchSpeakerIdentity: typeof touchSpeakerIdentity;
    isPrivateAlias: typeof isPrivateAlias;
};
declare const plugin: {
    id: string;
    name: string;
    description: string;
    configSchema: {
        type: string;
        properties: {
            storePath: {
                type: string;
                description: string;
                default: string;
            };
            databasePath: {
                type: string;
                description: string;
                default: string;
            };
            autoLearn: {
                type: string;
                description: string;
                default: boolean;
            };
            inject: {
                type: string;
                description: string;
                default: boolean;
            };
            maxNotes: {
                type: string;
                description: string;
                default: number;
                minimum: number;
                maximum: number;
            };
            maxCardChars: {
                type: string;
                description: string;
                default: number;
                minimum: number;
                maximum: number;
            };
            maxRosterNames: {
                type: string;
                description: string;
                default: number;
                minimum: number;
                maximum: number;
            };
            maxRecallEvents: {
                type: string;
                description: string;
                default: number;
                minimum: number;
                maximum: number;
            };
            includeDisplayName: {
                type: string;
                description: string;
                default: boolean;
            };
            privateAliases: {
                type: string;
                items: {
                    type: string;
                };
                description: string;
                default: never[];
                maxItems: number;
            };
            passiveDiscordLogTail: {
                type: string;
                description: string;
                properties: {
                    enabled: {
                        type: string;
                        default: boolean;
                    };
                    logPath: {
                        type: string;
                        default: string;
                    };
                    openclawConfigPath: {
                        type: string;
                        default: string;
                    };
                    pollMs: {
                        type: string;
                        default: number;
                        minimum: number;
                        maximum: number;
                    };
                };
                additionalProperties: boolean;
            };
            passiveDiscordGateway: {
                type: string;
                description: string;
                properties: {
                    enabled: {
                        type: string;
                        default: boolean;
                    };
                    openclawConfigPath: {
                        type: string;
                        default: string;
                    };
                    captureMessages: {
                        type: string;
                        description: string;
                        default: boolean;
                    };
                    captureGuildMembers: {
                        type: string;
                        description: string;
                        default: boolean;
                    };
                    maxCapturedMessages: {
                        type: string;
                        description: string;
                        default: number;
                        minimum: number;
                        maximum: number;
                    };
                    maxMessageChars: {
                        type: string;
                        description: string;
                        default: number;
                        minimum: number;
                        maximum: number;
                    };
                };
                additionalProperties: boolean;
            };
            passiveIMessageWatch: {
                type: string;
                description: string;
                properties: {
                    enabled: {
                        type: string;
                        default: boolean;
                    };
                    commandPath: {
                        type: string;
                        description: string;
                        default: string;
                    };
                    captureMessages: {
                        type: string;
                        description: string;
                        default: boolean;
                    };
                    includeSelfMessages: {
                        type: string;
                        description: string;
                        default: boolean;
                    };
                    maxCapturedMessages: {
                        type: string;
                        description: string;
                        default: number;
                        minimum: number;
                        maximum: number;
                    };
                    maxMessageChars: {
                        type: string;
                        description: string;
                        default: number;
                        minimum: number;
                        maximum: number;
                    };
                };
                additionalProperties: boolean;
            };
            llmSummarization: {
                type: string;
                description: string;
                properties: {
                    enabled: {
                        type: string;
                        default: boolean;
                    };
                    endpoint: {
                        type: string;
                        default: string;
                    };
                    model: {
                        type: string;
                        default: string;
                    };
                    timeoutMs: {
                        type: string;
                        default: number;
                        minimum: number;
                        maximum: number;
                    };
                    maxInputChars: {
                        type: string;
                        default: number;
                        minimum: number;
                        maximum: number;
                    };
                    maxNotesPerMessage: {
                        type: string;
                        default: number;
                        minimum: number;
                        maximum: number;
                    };
                    numCtx: {
                        type: string;
                        description: string;
                        minimum: number;
                        maximum: number;
                    };
                    keepAlive: {
                        anyOf: ({
                            type: string;
                            const?: undefined;
                        } | {
                            type: string;
                            const: boolean;
                        })[];
                        description: string;
                    };
                    fallbackToPatterns: {
                        type: string;
                        default: boolean;
                    };
                };
                additionalProperties: boolean;
            };
            daemonSummarization: {
                type: string;
                description: string;
                properties: {
                    enabled: {
                        type: string;
                        default: boolean;
                    };
                    endpoint: {
                        type: string;
                        default: string;
                    };
                    timeoutMs: {
                        type: string;
                        default: number;
                        minimum: number;
                        maximum: number;
                    };
                    maxOutputTokens: {
                        type: string;
                        default: number;
                        minimum: number;
                        maximum: number;
                    };
                };
                additionalProperties: boolean;
            };
            libravdbProjection: {
                type: string;
                description: string;
                properties: {
                    enabled: {
                        type: string;
                        default: boolean;
                    };
                    endpoint: {
                        type: string;
                        default: string;
                    };
                    tenantKey: {
                        type: string;
                        description: string;
                    };
                    pushCapturedMessages: {
                        type: string;
                        description: string;
                        default: boolean;
                    };
                    timeoutMs: {
                        type: string;
                        default: number;
                        minimum: number;
                        maximum: number;
                    };
                    retryDelayMs: {
                        type: string;
                        default: number;
                        minimum: number;
                        maximum: number;
                    };
                    maxAttempts: {
                        type: string;
                        default: number;
                        minimum: number;
                        maximum: number;
                    };
                };
                additionalProperties: boolean;
            };
        };
        additionalProperties: boolean;
    };
    register(api: OpenClawPluginApi): void;
};
export default plugin;
