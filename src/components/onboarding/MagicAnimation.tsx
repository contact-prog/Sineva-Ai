import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Loader2 } from 'lucide-react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Float, MeshDistortMaterial, Sphere } from '@react-three/drei';

interface Step {
  id: string;
  label: string;
  completed: boolean;
}

export function MagicAnimation() {
  const [steps, setSteps] = useState<Step[]>([
    { id: '1', label: 'Analyzing your website...', completed: false },
    { id: '2', label: 'Extracting brand colors and logo...', completed: false },
    { id: '3', label: 'Understanding your business...', completed: false },
    { id: '4', label: 'Generating social media posts...', completed: false },
    { id: '5', label: 'Creating blog post ideas...', completed: false },
    { id: '6', label: 'Designing your marketing strategy...', completed: false },
  ]);

  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Simulate progressive completion
    const intervals = [3000, 5000, 8000, 12000, 16000, 20000]; // Timing for each step
    
    intervals.forEach((delay, index) => {
      setTimeout(() => {
        setSteps(prev => prev.map((step, i) => 
          i === index ? { ...step, completed: true } : step
        ));
        setProgress(((index + 1) / intervals.length) * 100);
      }, delay);
    });
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/20 via-background to-secondary/20 flex items-center justify-center overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-20 left-20 w-72 h-72 bg-primary/30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-secondary/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="relative z-10 w-full max-w-4xl px-4 space-y-12">
        {/* 3D Animation Scene */}
        <div className="h-96 relative">
          <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} />
            <Float speed={1.5} rotationIntensity={1} floatIntensity={2}>
              <Sphere args={[1, 100, 100]} scale={2.5}>
                <MeshDistortMaterial
                  color="#6366f1"
                  attach="material"
                  distort={0.4}
                  speed={2}
                  roughness={0.2}
                />
              </Sphere>
            </Float>
            <Float speed={1} rotationIntensity={0.5} floatIntensity={1}>
              <Sphere args={[0.5, 50, 50]} position={[2, 1, 0]} scale={1.2}>
                <MeshDistortMaterial
                  color="#8b5cf6"
                  attach="material"
                  distort={0.3}
                  speed={1.5}
                  roughness={0.3}
                />
              </Sphere>
            </Float>
            <Float speed={1.2} rotationIntensity={0.8} floatIntensity={1.5}>
              <Sphere args={[0.3, 50, 50]} position={[-2, -1, 0]}>
                <MeshDistortMaterial
                  color="#ec4899"
                  attach="material"
                  distort={0.2}
                  speed={1.8}
                  roughness={0.4}
                />
              </Sphere>
            </Float>
            <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.5} />
          </Canvas>

          {/* Center Text Overlay */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
              className="text-center space-y-2"
            >
              <h2 className="text-4xl font-bold text-foreground">
                Magic is Happening...
              </h2>
              <p className="text-lg text-muted-foreground">
                Sit back while AI analyzes your brand
              </p>
            </motion.div>
          </div>
        </div>

        {/* Progress Steps */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="bg-card/80 backdrop-blur-md border border-border rounded-2xl p-8 shadow-2xl space-y-6"
        >
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Overall Progress</span>
              <span className="font-semibold text-foreground">{Math.round(progress)}%</span>
            </div>
            <div className="h-3 bg-muted rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-primary to-secondary"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>

          {/* Step List */}
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {steps.map((step, index) => (
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center gap-3"
                >
                  <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                    step.completed 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {step.completed ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    )}
                  </div>
                  <span className={`text-sm ${
                    step.completed ? 'text-foreground' : 'text-muted-foreground'
                  }`}>
                    {step.label}
                  </span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
