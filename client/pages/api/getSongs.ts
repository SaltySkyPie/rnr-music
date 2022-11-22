import { NextApiRequest, NextApiResponse } from "next";
import fs from "node:fs";
import path from "node:path";
import { readdir } from "fs/promises";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  let final: Array<Object> = [];
  const categories = await getDirectories(process.env.LOCAL_MUSIC);

  for await (const dir of categories) {
    const category = {
      name: dir,
      files: await getFiles(dir),
    };
    final.push(category);
  }
  res.json(final);
  return;
}

const getFiles = (dir: any) =>
  new Promise((resolve) => {
    const files = fs.readdirSync(`${process.env.LOCAL_MUSIC}/${dir}` as string).filter((file) => file.endsWith(".m3u8"));
    files.sort();
    resolve(files)
  });

const getDirectories = async (source: any) =>
  (await readdir(source, { withFileTypes: true }))
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);
