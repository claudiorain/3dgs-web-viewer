
import { Color4, Vector3, Matrix, Quaternion, ArcRotateCamera, HemisphericLight } from "@babylonjs/core";
import { SPLATFileLoader } from "@babylonjs/loaders/SPLAT"


const loadScene = async (canvas, engine,scene, pointCloudData, camerasData) => {
  scene.clearColor = new Color4(0, 0, 0, 1); // Nero opaco (RGBA)

  // Usa il primo set di dati della telecamera per configurare la scena
  const cameraData = camerasData[Math.floor(Math.random() * camerasData.length)]; // Se hai più di una telecamera, puoi selezionare quella che ti serve
  // Posizione della telecamera
  const position = new Vector3(
    cameraData.position[0],  // X rimane invariato
    cameraData.position[2],  // Scambio Y <-> Z
    -cameraData.position[1]  // Inverto Y
  );



  // Creazione della telecamera
  const camera = new ArcRotateCamera(
    "camera",
    0,  // Angoli azimutali e di elevazione impostati più avanti
    0,
    5,  // Distanza iniziale (puoi cambiarla in base alle tue esigenze)
    Vector3.Zero(),
    scene
  );

  // Imposta la posizione della telecamera
  camera.position = position;

  // Creazione della matrice di rotazione a partire dalla matrice 3x3 fornita
  const rotationMatrix = new Matrix(
    cameraData.rotation[0][0], cameraData.rotation[0][1], cameraData.rotation[0][2], 0,
    cameraData.rotation[1][0], cameraData.rotation[1][1], cameraData.rotation[1][2], 0,
    cameraData.rotation[2][0], cameraData.rotation[2][1], cameraData.rotation[2][2], 0,
    0, 0, 0, 1
  );

  // Applicazione della rotazione alla telecamera
  const quaternion = Quaternion.FromRotationMatrix(rotationMatrix);
  // Imposta la rotazione della telecamera usando il quaternion
  camera.rotationQuaternion = quaternion;

  // Calcola il FOV dal dataset
  let fovY = 2 * Math.atan(cameraData.height / (2 * cameraData.fy));

  // Correggi il FOV manualmente se necessario
  const fovCorrectionFactor = 1.5; // 🔥 Questo valore lo regoli sperimentalmente
  fovY *= fovCorrectionFactor;

  camera.fov = fovY; // Imposta il nuovo FOV sulla camera



  camera.attachControl(canvas, true);
  new HemisphericLight("light", new Vector3(1, 1, 0), scene);


  const container = await new SPLATFileLoader().loadAssetContainerAsync(scene, pointCloudData, "");

  // ✅ Aggiunge il modello alla scena
  container.addAllToScene();

  console.log("PLY model loaded:", container);

  engine.runRenderLoop(() => {
    scene.render();
  });


};

export { loadScene };