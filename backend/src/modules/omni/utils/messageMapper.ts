import { IMessage } from '../interfaces/IMessage';
import { MessageDirection, MessageSenderType } from '../types/message.types';

export function hydrateMessage(raw: IMessage): IMessage {
  const platform = (raw.platform_data as Record<string, any>) || {};
  const metadata =
    raw.metadata ||
    platform.metadata ||
    {};

  const channelId =
    raw.channel_id ||
    platform.channel_id ||
    platform.channelId;

  const recipient =
    raw.recipient_identifier ||
    platform.recipient ||
    platform.recipient_identifier;

  const direction: MessageDirection =
    raw.direction ||
    platform.direction ||
    (raw.sender_type === MessageSenderType.CUSTOMER
      ? MessageDirection.INBOUND
      : MessageDirection.OUTBOUND);

  const isPrivate = raw.is_private ?? raw.is_internal ?? false;

  return {
    ...raw,
    metadata,
    platform_data: platform,
    channel_id: channelId,
    recipient_identifier: recipient,
    direction,
    is_private: isPrivate
  };
}
