export function latestWriteWins<T extends { updatedAt?: string | Date }>(local: T, remote: T) {
  const localTime = local.updatedAt ? new Date(local.updatedAt).getTime() : 0;
  const remoteTime = remote.updatedAt ? new Date(remote.updatedAt).getTime() : 0;

  return localTime >= remoteTime ? local : remote;
}
