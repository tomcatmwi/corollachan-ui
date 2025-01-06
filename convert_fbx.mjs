import fs from 'fs';
import path from 'path';
import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';

console.log('FBX converter 1.0');
const loader = new FBXLoader();
const assetPath = path.join('src', 'assets', 'animations');

fs
    .readdirSync(assetPath)
    .forEach(file => {
        if (!file.endsWith('.fbx'))
            return;

        console.log(`Converting: ${file}...`);

        const buffer = fs.readFileSync(path.join(assetPath, file));
        const data = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);

        let asset;

        try {
            asset = loader.parse(data, '');

            //process.exit();

            fs.writeFileSync(path.join(assetPath, file.replace(/\.fbx/, '.json')), JSON.stringify(asset.toJSON()));
        }
        catch(e) {
            console.error(e.message);
//            process.exit();
        }
    });

console.log(`All done.`);
