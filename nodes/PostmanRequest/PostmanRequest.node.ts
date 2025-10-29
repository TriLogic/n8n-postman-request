import type {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
  IDataObject,
} from 'n8n-workflow';
import { properties } from './descriptions';
import { buildMultipart, toKeyValue } from './utils';
import { VM } from 'vm2';
import * as chai from 'chai';

export class PostmanRequest implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Postman Request',
    name: 'postmanRequest',
    group: ['transform'],
    version: 1,
    description: 'Perform HTTP requests with Postman-like feature parity',
    defaults: { name: 'Postman Request' },
    inputs: ['main'],
    outputs: ['main'],
    credentials: [
      { name: 'postmanAuthApi', required: false },
      { name: 'oAuth2Api', required: false },
    ],
    properties,
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const out: INodeExecutionData[] = [];

    for (let i = 0; i < items.length; i++) {
      try {
        const startedAt = Date.now();
        const method = this.getNodeParameter('method', i) as string;
        const url = this.getNodeParameter('url', i) as string;
        const queryParameters = toKeyValue(this.getNodeParameter('queryParameters', i), 'parameters');
        const headers = toKeyValue(this.getNodeParameter('headers', i), 'headers');
        const bodyMode = this.getNodeParameter('bodyMode', i) as string;
        let requestBodyMeta: any = { mode: bodyMode };

        const options = this.getNodeParameter('options', i, {}) as IDataObject;

        // Build request
        const requestOptions: IDataObject = {
          method,
          uri: url,
          qs: queryParameters,
          headers: { ...headers },
          followRedirect: options.followRedirect !== false,
          maxRedirects: options.maxRedirects ?? 5,
          timeout: options.timeout ?? 30000,
          proxy: options.proxy || undefined,
          gzip: options.gzip !== false,
          decompress: options.decompress !== false,
          useQuerystring: true,
          json: false,
          encoding: null, // Buffer
          resolveWithFullResponse: true, // get status/headers consistently
          simple: false, // don't auto-throw on 4xx/5xx; we handle manually
        };

        // Body
        if (bodyMode === 'formUrlEncoded') {
          const fields = toKeyValue(this.getNodeParameter('formFields', i), 'fields');
          requestOptions.form = fields;
          requestBodyMeta = { mode: 'formUrlEncoded', form: fields };
        } else if (bodyMode === 'multipart') {
          const form = await buildMultipart.call(this, i, this.getNodeParameter('multipart', i));
          // @ts-ignore
          requestOptions.formData = form as any;
          Object.assign(requestOptions.headers as IDataObject, (form as any).getHeaders());
          requestBodyMeta = { mode: 'multipart' };
        } else if (bodyMode === 'raw') {
          const rawBody = this.getNodeParameter('rawBody', i) as string;
          const contentType = (this.getNodeParameter('rawContentType', i) as string) || 'application/octet-stream';
          (requestOptions.headers as IDataObject)['Content-Type'] = contentType;
          requestOptions.body = Buffer.from(rawBody);
          requestBodyMeta = { mode: 'raw', raw: rawBody, contentType };
        } else if (bodyMode === 'graphql') {
          const query = this.getNodeParameter('gqlQuery', i) as string;
          const variables = this.getNodeParameter('gqlVariables', i) as string;
          (requestOptions.headers as IDataObject)['Content-Type'] = 'application/json';
          const gql = { query, variables: variables ? JSON.parse(variables) : {} };
          requestOptions.body = Buffer.from(JSON.stringify(gql));
          requestBodyMeta = { mode: 'graphql', graphql: gql };
        } else if (bodyMode === 'binary') {
          const binProp = this.getNodeParameter('binaryProperty', i) as string;
          const bin = this.helpers.assertBinaryData(i, binProp);
          (requestOptions.headers as IDataObject)['Content-Type'] = bin.mimeType || 'application/octet-stream';
          requestOptions.body = Buffer.from(bin.data);
          requestBodyMeta = { mode: 'binary', propertyName: binProp, fileName: bin.fileName, mimeType: bin.mimeType };
        }

        // Authentication
        const cred = await this.getCredentials('postmanAuthApi').catch(() => undefined);
        let response: any;
        if (cred && cred.authType && cred.authType !== 'none') {
          if (cred.authType === 'basic') {
            requestOptions.auth = { user: cred.username as string, pass: cred.password as string };
          } else if (cred.authType === 'bearer') {
            (requestOptions.headers as IDataObject)['Authorization'] = `Bearer ${cred.token}`;
          } else if (cred.authType === 'apikey') {
            if (cred.apiKeyLocation === 'query') {
              (requestOptions.qs as IDataObject)[cred.apiKeyName as string] = cred.apiKeyValue as string;
            } else {
              (requestOptions.headers as IDataObject)[cred.apiKeyName as string] = cred.apiKeyValue as string;
            }
          } else if (cred.authType === 'oauth2') {
            response = await this.helpers.requestOAuth2.call(this, 'oAuth2Api', requestOptions);
          }
        }

        if (!response) {
          response = await this.helpers.request(requestOptions);
        }

        const endedAt = Date.now();
        const elapsedMs = endedAt - startedAt;

        // Response handling
        const respFormat = (options.responseFormat as string) || 'auto';
        const fullResponse = options.fullResponse === true;
        const failOnError = options.failOnError !== false; // default true

        let data: any = response;
        let statusCode: number | undefined;
        let statusMessage: string | undefined;
        let headersResp: IDataObject | undefined;
        let headersLower: Record<string, any> | undefined;

        if (response && response.body !== undefined && response.headers !== undefined) {
          statusCode = response.statusCode;
          statusMessage = (response as any).statusMessage;
          headersResp = response.headers as any;
          headersLower = Object.fromEntries(Object.entries(headersResp as any).map(([k, v]) => [String(k).toLowerCase(), v]));
          data = response.body;
        }

        const text = Buffer.isBuffer(data) ? data.toString('utf8') : data;
        const contentType = (headersResp?.['content-type'] as string) || (requestOptions.headers as IDataObject)['Content-Type'];
        let parsed: any = text;
        if (respFormat === 'json' || (respFormat === 'auto' && typeof text === 'string' && /application\/json|\+json/.test(String(contentType)))) {
          try { parsed = typeof text === 'string' ? JSON.parse(text) : text; } catch { parsed = text; }
        } else if (respFormat === 'text') {
          parsed = typeof text === 'string' ? text : Buffer.from(text as any).toString('utf8');
        } else if (respFormat === 'binary') {
          parsed = Buffer.isBuffer(data) ? data : Buffer.from(typeof data === 'string' ? data : JSON.stringify(data));
        }

        if (failOnError && statusCode && statusCode >= 400) {
          throw new Error(`HTTP ${statusCode}: ${typeof parsed === 'string' ? (parsed as string).slice(0, 500) : JSON.stringify(parsed).slice(0, 500)}`);
        }

        // Assertions (optional)
        const enableAssertions = this.getNodeParameter('enableAssertions', i, false) as boolean;
        let testSummary: any | undefined;
        if (enableAssertions) {
          const assertions = (this.getNodeParameter('assertions', i, '') as string) || '';
          const vm = new VM({ timeout: 3000, sandbox: {} });

          // Cookies
          const setCookie = headersLower?.['set-cookie'];
          const cookieArr: string[] = Array.isArray(setCookie) ? setCookie : (setCookie ? [setCookie] : []);
          const cookieMap: Record<string, string> = {};
          for (const c of cookieArr) {
            const [pair] = String(c).split(';');
            const [k, v] = pair.split('=');
            if (k) cookieMap[k.trim()] = (v || '').trim();
          }

          // Simple variable stores (per item execution)
          const envStore: Record<string, any> = {};
          const globalStore: Record<string, any> = {};

          const getHeader = (name: string) => headersLower?.[String(name).toLowerCase()];
          const tests: Array<{ name: string; passed: boolean; error?: string }> = [];

          const pm = {
            expect: chai.expect,

            info: {
              iteration: i,
              requestName: this.getNode().name,
              iterationCount: items.length,
            },

            response: {
              status: statusCode,
              code: statusCode,
              reason: statusMessage,
              headers: headersResp,
              body: parsed,
              responseTime: elapsedMs,
              size: Buffer.isBuffer(data)
                ? (data as Buffer).length
                : Buffer.byteLength(typeof data === 'string' ? data : JSON.stringify(data || '')),
              to: { have: {
                status: (c: number) => chai.expect(statusCode).to.equal(c),
                header: (n: string) => chai.expect(getHeader(n)).to.not.equal(undefined),
                headerValue: (n: string, v: any) => chai.expect(getHeader(n)).to.satisfy((x: any) => String(x).toLowerCase().includes(String(v).toLowerCase())),
              }},
            },

            request: { method, url, headers: requestOptions.headers, query: requestOptions.qs, body: requestBodyMeta },

            test: (name: string, fn: Function) => {
              try { fn(); tests.push({ name, passed: true }); }
              catch (e: any) { tests.push({ name, passed: false, error: e?.message || String(e) }); /* don't rethrow */ }
            },

            cookies: {
              get: (n: string) => cookieMap[n],
              has: (n: string) => Object.prototype.hasOwnProperty.call(cookieMap, n),
              toObject: () => ({ ...cookieMap }),
            },

            environment: {
              get: (k: string) => envStore[k],
              set: (k: string, v: any) => (envStore[k] = v),
              unset: (k: string) => delete envStore[k],
              clear: () => { for (const k of Object.keys(envStore)) delete envStore[k]; },
            },

            globals: {
              get: (k: string) => globalStore[k],
              set: (k: string, v: any) => (globalStore[k] = v),
              unset: (k: string) => delete globalStore[k],
              clear: () => { for (const k of Object.keys(globalStore)) delete globalStore[k]; },
            },

            variables: {
              get: (k: string) => envStore[k] ?? globalStore[k],
              set: (k: string, v: any) => (envStore[k] = v),
              unset: (k: string) => { delete envStore[k]; delete globalStore[k]; },
            },
          };

          vm.freeze(pm, 'pm');
          vm.freeze(chai as any, 'chai');
          vm.freeze((chai as any).expect, 'expect');

          try {
            vm.run(assertions);
          } catch (e: any) {
            tests.push({ name: 'script error', passed: false, error: e?.message || String(e) });
          }

          testSummary = {
            passed: tests.filter((t) => t.passed).length,
            failed: tests.filter((t) => !t.passed).length,
            results: tests,
          };

          if (testSummary.failed > 0 && !this.continueOnFail()) {
            throw new Error(`Assertions failed: ${testSummary.failed}`);
          }
        }

        // Output
        if (respFormat === 'binary') {
        const binBuffer = Buffer.isBuffer(parsed)
            ? parsed
            : Buffer.from(typeof parsed === 'string' ? parsed : JSON.stringify(parsed));

        const mime = String(headersResp?.['content-type'] ?? 'application/octet-stream');
        const binaryData = await this.helpers.prepareBinaryData(binBuffer, 'response', mime);

        out.push({
            json: { __tests: testSummary },
            binary: { data: binaryData }, // <-- correct n8n binary format (base64 inside)
        });
        } else if (fullResponse) {
        out.push({ json: { body: parsed, statusCode, headers: headersResp, responseTime: elapsedMs, __tests: testSummary } as IDataObject });
        } else {
        out.push({
            json: {
            ...((typeof parsed === 'object' && parsed !== null) ? parsed : { body: parsed }),
            __meta: { statusCode, headers: headersResp, responseTime: elapsedMs },
            __tests: testSummary,
            },
        });
        }

      } catch (err: any) {
        if (this.continueOnFail()) {
          out.push({ json: { error: err.message, stack: err.stack }, pairedItem: { item: i } });
          continue;
        }
        throw err;
      }
      // output ends

    }

    return [out];
  }
}