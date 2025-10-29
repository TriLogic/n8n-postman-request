import type { INodeProperties } from 'n8n-workflow';

export const properties: INodeProperties[] = [
  {
    displayName: 'Method',
    name: 'method',
    type: 'options',
    default: 'GET',
    options: ['GET','POST','PUT','PATCH','DELETE','HEAD','OPTIONS'].map((m) => ({ name: m, value: m })),
  },
  {
    displayName: 'URL',
    name: 'url',
    type: 'string',
    default: '',
    placeholder: 'https://api.example.com/resource',
    required: true,
  },
  {
    displayName: 'Query Parameters',
    name: 'queryParameters',
    type: 'fixedCollection',
    typeOptions: { multipleValues: true },
    default: {},
    options: [
      {
        name: 'parameters',
        displayName: 'Parameters',
        values: [
          { displayName: 'Name', name: 'name', type: 'string', default: '' },
          { displayName: 'Value', name: 'value', type: 'string', default: '' },
          { displayName: 'Disable', name: 'disabled', type: 'boolean', default: false },
        ],
      },
    ],
  },
  {
    displayName: 'Headers',
    name: 'headers',
    type: 'fixedCollection',
    typeOptions: { multipleValues: true },
    default: {},
    options: [
      {
        name: 'headers',
        displayName: 'Headers',
        values: [
          { displayName: 'Name', name: 'name', type: 'string', default: '' },
          { displayName: 'Value', name: 'value', type: 'string', default: '' },
          { displayName: 'Disable', name: 'disabled', type: 'boolean', default: false },
        ],
      },
    ],
  },
  {
    displayName: 'Body Mode',
    name: 'bodyMode',
    type: 'options',
    default: 'none',
    options: [
      { name: 'None', value: 'none' },
      { name: 'Form URL Encoded', value: 'formUrlEncoded' },
      { name: 'Multipart Form-Data', value: 'multipart' },
      { name: 'Raw (JSON/Text/XML)', value: 'raw' },
      { name: 'GraphQL', value: 'graphql' },
      { name: 'Binary (From Item)', value: 'binary' },
    ],
  },
  // form-url-encoded
  {
    displayName: 'Fields',
    name: 'formFields',
    type: 'fixedCollection',
    typeOptions: { multipleValues: true },
    default: {},
    displayOptions: { show: { bodyMode: ['formUrlEncoded'] } },
    options: [
      {
        name: 'fields',
        displayName: 'Fields',
        values: [
          { displayName: 'Name', name: 'name', type: 'string', default: '' },
          { displayName: 'Value', name: 'value', type: 'string', default: '' },
          { displayName: 'Disable', name: 'disabled', type: 'boolean', default: false },
        ],
      },
    ],
  },
  // multipart
  {
    displayName: 'Parts',
    name: 'multipart',
    type: 'fixedCollection',
    typeOptions: { multipleValues: true },
    default: {},
    displayOptions: { show: { bodyMode: ['multipart'] } },
    options: [
      {
        name: 'parts',
        displayName: 'Parts',
        values: [
          { displayName: 'Name', name: 'name', type: 'string', default: '' },
          { displayName: 'Type', name: 'type', type: 'options', default: 'text', options: [
            { name: 'Text', value: 'text' },
            { name: 'Binary (From Item)', value: 'binary' },
          ] },
          { displayName: 'Value / Binary Property', name: 'value', type: 'string', default: '' },
          { displayName: 'Content-Type (optional)', name: 'contentType', type: 'string', default: '' },
          { displayName: 'File Name (optional)', name: 'fileName', type: 'string', default: '' },
          { displayName: 'Disable', name: 'disabled', type: 'boolean', default: false },
        ],
      },
    ],
  },
  // raw
  { displayName: 'Raw Body', name: 'rawBody', type: 'string', typeOptions: { rows: 10 }, default: '', displayOptions: { show: { bodyMode: ['raw'] } } },
  { displayName: 'Raw Content-Type', name: 'rawContentType', type: 'string', default: 'application/json', displayOptions: { show: { bodyMode: ['raw'] } } },

  // graphql
  { displayName: 'Query', name: 'gqlQuery', type: 'string', typeOptions: { rows: 8 }, default: '', displayOptions: { show: { bodyMode: ['graphql'] } } },
  { displayName: 'Variables (JSON)', name: 'gqlVariables', type: 'string', typeOptions: { rows: 4 }, default: '{}', displayOptions: { show: { bodyMode: ['graphql'] } } },

  // binary
  { displayName: 'Binary Property', name: 'binaryProperty', type: 'string', default: 'data', displayOptions: { show: { bodyMode: ['binary'] } } },

  // options
  {
    displayName: 'Options',
    name: 'options',
    type: 'collection',
    default: {},
    options: [
      { displayName: 'Use Cookie Jar', name: 'useCookieJar', type: 'boolean', default: false },
      { displayName: 'Follow Redirect', name: 'followRedirect', type: 'boolean', default: true },
      { displayName: 'Max Redirects', name: 'maxRedirects', type: 'number', typeOptions: { minValue: 0, maxValue: 20 }, default: 5 },
      { displayName: 'Timeout (ms)', name: 'timeout', type: 'number', default: 30000 },
      { displayName: 'Proxy', name: 'proxy', type: 'string', default: '' },
      { displayName: 'Decompress', name: 'decompress', type: 'boolean', default: true },
      { displayName: 'Gzip', name: 'gzip', type: 'boolean', default: true },
      { displayName: 'Response Format', name: 'responseFormat', type: 'options', default: 'auto', options: [
        { name: 'Auto', value: 'auto' }, { name: 'JSON', value: 'json' }, { name: 'Text', value: 'text' }, { name: 'Binary', value: 'binary' }
      ] },
      { displayName: 'Return Full Response', name: 'fullResponse', type: 'boolean', default: false },
      { displayName: 'Continue On HTTP Error', name: 'failOnError', type: 'boolean', default: true },
    ],
  },

  // assertions (Chai)
  { displayName: 'Enable Assertions (Chai)', name: 'enableAssertions', type: 'boolean', default: false },
  {
    displayName: 'Assertions (JS using chai.expect / pm)',
    name: 'assertions',
    type: 'string',
    typeOptions: { rows: 10 },
    default: '',
    placeholder: "pm.test('200',()=>pm.response.to.have.status(200))\npm.expect(pm.response.headers['content-type']).to.match(/json/i)",
    displayOptions: { show: { enableAssertions: [true] } },
  },
];