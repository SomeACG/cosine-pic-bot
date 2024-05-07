import { CommandEntity } from '@/constants/types';

// const urlPattern = /^(((ht|f)tps?):\/\/)?([^!@#$%^&*?.\s-]([^!@#$%^&*?.\s]{0,63}[^!@#$%^&*?.\s])?\.)+[a-z]{2,6}\/?/g;

export function parseParams(command: string): CommandEntity {
  if (!command)
    return {
      name: '',
      args: [],
    };
  const cmd = command.trim();
  const name = cmd.slice(1);
  // 如果命令中不包含空格，意味着命令后没有参数，只解析命令名称。
  if (cmd.search(' ') == -1)
    return {
      name,
      args: [],
    };
  const argsArr = cmd.split(' ');
  if (!argsArr?.length || argsArr?.length === 1) return { name: command, args: [] };
  return {
    name,
    args: argsArr.slice(1),
  };
}
