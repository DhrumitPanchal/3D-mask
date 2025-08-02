"use client";

import * as THREE from "three";
import { useEffect, useRef } from "react";
import gsap from "gsap";

import {
  DRACOLoader,
  GLTFLoader,
  RGBELoader,
  OrbitControls,
} from "three-stdlib";

export default function ThreeMaskScene() {
  const containerRef = useRef();

  useEffect(() => {
    let scene, camera, renderer, controls;
    let modelRef = null;
    let mouse = { x: 0.5, y: 0.5 };
    let mouseFollowEnabled = false;

    const params = {
      exposure: 0.1 ,
      toneMapping: THREE.NeutralToneMapping,
    };

    const init = async () => {
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;

      scene = new THREE.Scene();

      renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(width, height);
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.toneMapping = params.toneMapping;
      renderer.toneMappingExposure = params.exposure;
      containerRef.current.appendChild(renderer.domElement);

      camera = new THREE.PerspectiveCamera(45, width / height, 0.01, 10);
      camera.position.set(0.1, 0.03, 0.09);
      camera.lookAt(0, 0.03, 0);

      controls = new OrbitControls(camera, renderer.domElement);
      controls.enablePan = false;
      controls.enableDamping = true;
      controls.minDistance = 0.03;
      controls.maxDistance = 0.2;
      controls.target.set(0, 0.03, 0);
      controls.update();

      const light = new THREE.DirectionalLight(0xffffff, 3);
      light.position.set(1, 0.05, 0.7);
      scene.add(light);

      const rgbeLoader = new RGBELoader().setPath("/textures/");
      const gltfLoader = new GLTFLoader();
      const dracoLoader = new DRACOLoader();
      dracoLoader.setDecoderPath("/libs/draco/");
      gltfLoader.setDRACOLoader(dracoLoader);

      const [hdrTexture, model] = await Promise.all([
        rgbeLoader.loadAsync("venice_sunset_1k.hdr"),
        gltfLoader.loadAsync("/models/venice_mask.glb"),
      ]);

      hdrTexture.mapping = THREE.EquirectangularReflectionMapping;
      scene.background = hdrTexture;
      scene.environment = hdrTexture;

      modelRef = model.scene;
      scene.add(modelRef);

      // ✅ Animate camera to front view
      gsap.to(camera.position, {
        x: 0,
        y: 0.03,
        z: 0.1,
        duration: 12,
        ease: "power2.inOut",
        onUpdate: () => {
          camera.lookAt(0, 0.03, 0);
          controls.update();
        },
        onComplete: () => {
          // ✅ Enable mouse-based rotation only after animation
          mouseFollowEnabled = true;
        //   window.addEventListener("mousemove", onMouseMove);
        },
      });

      const animate = () => {
        requestAnimationFrame(animate);

        // ✅ Only apply rotation if enabled
        if (mouseFollowEnabled && modelRef) {
          const targetRotX = (mouse.y - 0.5) * 0.3;
          const targetRotY = (mouse.x - 0.5) * 0.6;
          modelRef.rotation.x += (targetRotX - modelRef.rotation.x) * 0.05;
          modelRef.rotation.y += (targetRotY - modelRef.rotation.y) * 0.05;
        }

        controls.update();
        renderer.render(scene, camera);
      };
      animate();

      window.addEventListener("resize", onResize);
    };

    const onResize = () => {
      if (!renderer || !camera) return;
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    const onMouseMove = (event) => {
      const rect = containerRef.current.getBoundingClientRect();
      mouse.x = (event.clientX - rect.left) / rect.width - 10;
      mouse.y = (event.clientY - rect.top) / rect.height - 10;
    };

    init();

    return () => {
    //   window.removeEventListener("resize", onResize);
    //   window.removeEventListener("mousemove", onMouseMove);
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, []);

  return <div ref={containerRef} className="w-full h-screen" />;
}
