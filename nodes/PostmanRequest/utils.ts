import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import FormData from 'form-data';

export function toKeyValue(collection: any, key: string): Record<string, string> {
    const out: Record<string, string> = {};
    const rows = (collection?.[key] ?? []) as Array<{ name: string; value: string; disabled?: boolean }>;
   
    for (const row of rows) {
        if (!row || row.disabled) continue;
        if (row.name) out[row.name] = row.value ?? '';
    }
    
    return out;
}


export async function buildMultipart(this: IExecuteFunctions, idx: number, multipart: any) {
    
    const form = new FormData();
    const parts = (multipart?.parts ?? []) as Array<any>;
    
    for (const p of parts) {
        if (!p || p.disabled) continue;
        const name = p.name as string;
        if (!name) continue;
        if (p.type === 'binary') {
            const bin = this.helpers.assertBinaryData(idx, p.value);
            form.append(name, bin.data, { filename: p.fileName || bin.fileName, contentType: p.contentType || bin.mimeType });
        } else {
            form.append(name, p.value ?? '', { contentType: p.contentType || undefined, filename: p.fileName || undefined });
        }
    }

    return form;
}