import { apiClient } from '../../../lib/apiClient';
import type { ITransaction, ITransactionAttachment } from '../types';
import type { ITransactionFormValues } from '../validations';

const RESOURCE = '/transactions';

// The API exposes foreign keys as `account` / `to_account` / `category` and the
// attachment as `{ name, mimeType, size, url }`. Map to the frontend shape here.
interface IAttachmentApi {
  name: string;
  mimeType: string;
  size: number;
  url: string;
}

interface ITransactionApi
  extends Omit<ITransaction, 'accountId' | 'toAccountId' | 'categoryId' | 'attachment'> {
  account: string;
  toAccount: string | null;
  category: string | null;
  attachment: IAttachmentApi | null;
}

function fromApi(txn: ITransactionApi): ITransaction {
  const { account, toAccount, category, attachment, ...rest } = txn;
  return {
    ...rest,
    accountId: account,
    toAccountId: toAccount,
    categoryId: category,
    attachment: attachment
      ? {
          name: attachment.name,
          mimeType: attachment.mimeType,
          size: attachment.size,
          dataUrl: attachment.url,
        }
      : null,
  };
}

function toPayload(values: ITransactionFormValues) {
  const isTransfer = values.kind === 'transfer';
  return {
    kind: values.kind,
    amount: values.amount,
    account: values.accountId,
    toAccount: isTransfer ? values.toAccountId ?? null : null,
    category: isTransfer ? null : values.categoryId ?? null,
    date: values.date,
    notes: values.notes?.trim() ?? '',
  };
}

async function uploadAttachment(
  id: string,
  attachment: ITransactionAttachment,
): Promise<IAttachmentApi> {
  // Turn the picked file's data URL back into a binary blob for multipart upload.
  const blob = await (await fetch(attachment.dataUrl)).blob();
  const form = new FormData();
  form.append('file', blob, attachment.name);
  return apiClient.post<IAttachmentApi>(`${RESOURCE}/${id}/attachment`, form);
}

// A freshly picked file is a base64 data URL; an already-stored one is an http URL.
function isNewUpload(attachment: ITransactionAttachment | null | undefined): boolean {
  return Boolean(attachment && attachment.dataUrl.startsWith('data:'));
}

export function listTransactions(): Promise<ITransaction[]> {
  return apiClient
    .get<ITransactionApi[]>(`${RESOURCE}?page_size=1000&ordering=-date`)
    .then((items) => items.map(fromApi));
}

export async function createTransaction(
  values: ITransactionFormValues,
): Promise<ITransaction> {
  const created = await apiClient.post<ITransactionApi>(RESOURCE, toPayload(values));
  if (isNewUpload(values.attachment)) {
    const attachment = await uploadAttachment(created.id, values.attachment!);
    created.attachment = attachment;
  }
  return fromApi(created);
}

export async function updateTransaction(
  id: string,
  values: ITransactionFormValues,
): Promise<ITransaction> {
  const updated = await apiClient.patch<ITransactionApi>(
    `${RESOURCE}/${id}`,
    toPayload(values),
  );
  if (isNewUpload(values.attachment)) {
    updated.attachment = await uploadAttachment(id, values.attachment!);
  } else if (!values.attachment) {
    // Attachment cleared in the form — remove it server-side.
    await apiClient.delete(`${RESOURCE}/${id}/attachment`);
    updated.attachment = null;
  }
  return fromApi(updated);
}

export function deleteTransaction(id: string): Promise<void> {
  return apiClient.delete<void>(`${RESOURCE}/${id}`);
}
