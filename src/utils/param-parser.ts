import { CommandEntity } from '@/constants/types';

// const urlPattern = /^(((ht|f)tps?):\/\/)?([^!@#$%^&*?.\s-]([^!@#$%^&*?.\s]{0,63}[^!@#$%^&*?.\s])?\.)+[a-z]{2,6}\/?/g;

export function parseParams(command: string): CommandEntity {
  if (!command)
    return {
      name: '',
      args: [],
      original_msg: '',
    };
  const cmd = command.trim();
  // 如果命令中不包含空格，意味着命令后没有参数，只解析命令名称。
  if (cmd.search(' ') == -1)
    return {
      name: cmd.slice(1),
      args: [],
      original_msg: '',
    };
  const name = cmd.split(' ')?.[0]?.slice(1) ?? '';
  const original_msg = cmd.slice(name.length + 2);

  const argsArr = cmd.split(' ');
  const validArgsArr = argsArr.filter((v) => Boolean(v));
  if (!validArgsArr?.length || validArgsArr?.length === 1) return { name: command, args: [], original_msg };
  return {
    name,
    args: validArgsArr.slice(1),
    original_msg,
  };
}
