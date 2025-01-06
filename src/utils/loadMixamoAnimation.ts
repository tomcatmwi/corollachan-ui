import * as THREE from 'three';
import mixamoVRMRigMap from '@assets/mixamoVRMRigMap.json';
import { ObjectLoader } from 'three';

const objectLoader = new ObjectLoader();

/**
 * Loads a pre-converted Mixamo animation, converts and returns it.
 *
 * @param {string} asset A JSON asset
 * @param {VRM} vrm A target VRM
 * @returns {Promise<THREE.AnimationClip>} The converted AnimationClip
 */
export function loadMixamoAnimation(assetData, vrm) {

	const asset = objectLoader.parse(assetData);
	const clip = THREE.AnimationClip.findByName(asset.animations, 'mixamo.com');

	// KeyframeTracks compatible with VRM will be added here
	const tracks = [];

	const restRotationInverse = new THREE.Quaternion();
	const parentRestWorldRotation = new THREE.Quaternion();
	const _quatA = new THREE.Quaternion();
	const _vec3 = new THREE.Vector3();

	// Adjust with reference to hips height.
	const motionHipsHeight = asset.getObjectByName('mixamorigHips').position.y || 0;
	const vrmHipsY = vrm.humanoid?.getNormalizedBoneNode('hips').getWorldPosition(_vec3).y;
	const vrmRootY = vrm.scene.getWorldPosition(_vec3).y;
	const vrmHipsHeight = Math.abs(vrmHipsY - vrmRootY);
	const hipsPositionScale = vrmHipsHeight / motionHipsHeight;

	clip.tracks.forEach((track) => {

		// Convert each tracks for VRM use, and push to `tracks`
		const trackSplitted = track.name.split('.');
		const mixamoRigName = trackSplitted[0];
		const vrmBoneName = mixamoVRMRigMap[mixamoRigName];
		const vrmNodeName = vrm.humanoid?.getNormalizedBoneNode(vrmBoneName)?.name;

		const mixamoRigNode = asset.getObjectByName(mixamoRigName);

		if (vrmNodeName != null) {

			const propertyName = trackSplitted[1];

			// Store rotations of rest-pose.
			mixamoRigNode.getWorldQuaternion(restRotationInverse).invert();
			mixamoRigNode.parent.getWorldQuaternion(parentRestWorldRotation);

			if (track instanceof THREE.QuaternionKeyframeTrack) {

				// Retarget rotation of mixamoRig to NormalizedBone.
				for (let i = 0; i < track.values.length; i += 4) {

					const flatQuaternion = track.values.slice(i, i + 4);

					_quatA.fromArray(flatQuaternion);

					// Parent's World Rotation at Rest * Truck Rotation * Inverse of World Rotation at Rest
					_quatA
						.premultiply(parentRestWorldRotation)
						.multiply(restRotationInverse);

					_quatA.toArray(flatQuaternion);

					flatQuaternion.forEach((v, index) => track.values[index + i] = v);
				}

				tracks.push(
					new THREE.QuaternionKeyframeTrack(
						`${vrmNodeName}.${propertyName}`,
						track.times,
						track.values.map((v, i) => (vrm.meta?.metaVersion === '0' && i % 2 === 0 ? - v : v)),
					),
				);

			} else if (track instanceof THREE.VectorKeyframeTrack) {
				const value = track.values.map((v, i) => (vrm.meta?.metaVersion === '0' && i % 3 !== 1 ? - v : v) * hipsPositionScale);
				tracks.push(new THREE.VectorKeyframeTrack(`${vrmNodeName}.${propertyName}`, track.times, value));
			}
		}
	});
		
	return (new THREE.AnimationClip('vrmAnimation', clip.duration, tracks));
}
