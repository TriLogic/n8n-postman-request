export type BodyMode = 'none' | 'formUrlEncoded' | 'multipart' | 'raw' | 'graphql' | 'binary';

export interface RequestOptionsExtra {
    useCookieJar?: boolean;
    followRedirect?: boolean;
    maxRedirects?: number;
    timeout?: number; // ms
    proxy?: string;
    decompress?: boolean;
    gzip?: boolean;
    responseFormat?: 'auto' | 'json' | 'text' | 'binary';
    fullResponse?: boolean;
    failOnError?: boolean; // default true
}
