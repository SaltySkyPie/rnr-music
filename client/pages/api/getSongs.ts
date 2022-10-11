import { NextApiRequest, NextApiResponse } from "next";
import fs from 'node:fs'
import path from "node:path";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    
    res.json(await getFiles)
    return
}


const getFiles = new Promise(resolve => {
    fs.readdir(process.env.LOCAL_MUSIC as string, (err, files) => {
        resolve(files)
    })
})