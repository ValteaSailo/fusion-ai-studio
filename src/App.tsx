// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { 
  Wand2, Video, Settings, Download, Play, 
  Loader2, Sparkles, Clock, HardDrive, Zap, CheckCircle,
  Smartphone, PenTool, Layout, Type, Share2,
  ImagePlus, Mic, User, Lock, LogOut, Mail, ArrowRight, Music, 
  Trash2, X, Check, CreditCard, Search, Bell, 
  Home, Bookmark, Grid, Monitor, Film, Palette, 
  Upload, Camera, Users
} from 'lucide-react';

import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut, updateProfile, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, collection, onSnapshot } from 'firebase/firestore';

// Initialize Firebase
let app;
let auth;
let db;
const appId = typeof __app_id !== 'undefined' ? __app_id : 'fusion-ai-default';

try {
  if (typeof __firebase_config !== 'undefined') {
    const firebaseConfig = JSON.parse(__firebase_config);
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
  } else {
    let firebaseConfig = null;
    try {
      if (typeof import.meta !== 'undefined' && import.meta.env) {
        firebaseConfig = {
          apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
          authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
          projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
          storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
          messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
          appId: import.meta.env.VITE_FIREBASE_APP_ID || ''
        };
      }
    } catch (envError) {}
    
    if (firebaseConfig && firebaseConfig.apiKey) {
      app = initializeApp(firebaseConfig);
      auth = getAuth(app);
      db = getFirestore(app);
    }
  }
} catch (error) {
  console.error('Firebase initialization error:', error);
}

// Utility to load Stripe Script dynamically
const loadStripe = () => {
  return new Promise((resolve) => {
    if (window.Stripe) {
      resolve(window.Stripe);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://js.stripe.com/v3/';
    script.onload = () => resolve(window.Stripe);
    script.onerror = () => resolve(null);
    document.body.appendChild(script);
  });
};

export default function App() {
  // User Management State
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authError, setAuthError] = useState('');

  // App Navigation State
  const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard', 'create', 'pricing', 'saved', 'buy-credits'
  const [showAuth, setShowAuth] = useState(false);

  // Billing & Credit System State
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [credits, setCredits] = useState(0);
  const [plan, setPlan] = useState('none');

  // Edit Profile State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');

  // Generator & Library State
  const [savedVideos, setSavedVideos] = useState([]);
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [videoUrl, setVideoUrl] = useState(null);

  // Export Modal State
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState('mp4');
  const [exportQuality, setExportQuality] = useState('1080p');
  const [exportStatus, setExportStatus] = useState('');
  const [exportProgress, setExportProgress] = useState(0);
  
  // Advanced Features State
  const [inputType, setInputType] = useState('text'); // 'text', 'image', or 'video'
  const [uploadedImage, setUploadedImage] = useState(null);
  const [uploadedVideo, setUploadedVideo] = useState(null);
  const [enableAvatar, setEnableAvatar] = useState(false);
  const [enableSubtitles, setEnableSubtitles] = useState(true);
  const [voice, setVoice] = useState('elevenlabs-adam');
  const [thumbnails, setThumbnails] = useState([]);
  const [activeStyle, setActiveStyle] = useState('');
  const [mode, setMode] = useState('creator');
  const [topic, setTopic] = useState('');
  const [script, setScript] = useState('');
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [creatorStep, setCreatorStep] = useState(1);
  const [resolution, setResolution] = useState('720p');
  const [duration, setDuration] = useState('5s');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  
  const videoRef = useRef(null);

  const videoStyles = [
    { id: 'cinematic', name: 'Cinematic' },
    { id: 'anime', name: 'Anime' },
    { id: '3d', name: '3D Render' },
    { id: 'cyberpunk', name: 'Cyberpunk' },
    { id: 'watercolor', name: 'Watercolor' },
    { id: 'realistic', name: 'Photorealistic' },
  ];

  // --- FIREBASE AUTH LISTENER ---
  useEffect(() => {
    if (!auth) return;

    // Listen for auth state changes
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser({
          uid: firebaseUser.uid,
          name: firebaseUser.displayName || 'User',
          email: firebaseUser.email || 'user@example.com',
          avatar: firebaseUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${firebaseUser.email || firebaseUser.uid}`
        });
      } else {
        setUser(null);
      }
    });

    return () => unsubscribe();
  }, []);

  // --- FIRESTORE DATA LISTENER ---
  useEffect(() => {
    if (!user || !user.uid || !db) return;

    // 1. Listen to User Profile (Credits & Plan)
    const profileRef = doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'main');
    const unsubscribeProfile = onSnapshot(profileRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setCredits(data.credits || 0);
        setPlan(data.plan || 'none');
      }
    }, (err) => console.error("Profile sync error:", err));

    // 2. Listen to Saved Videos
    const videosRef = collection(db, 'artifacts', appId, 'users', user.uid, 'videos');
    const unsubscribeVideos = onSnapshot(videosRef, (snapshot) => {
      const vids = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      vids.sort((a, b) => b.timestamp - a.timestamp); // Sort newest videos first
      setSavedVideos(vids);
    }, (err) => console.error("Videos sync error:", err));

    return () => {
      unsubscribeProfile();
      unsubscribeVideos();
    };
  }, [user]);

  const handleExport = (destination) => {
    setExportStatus(`Preparing to export to ${destination}...`);
    setExportProgress(0);
    
    let p = 0;
    const interval = setInterval(() => {
      p += 15;
      setExportProgress(p);
      setExportStatus(p < 50 ? `Rendering ${exportFormat.toUpperCase()} at ${exportQuality}...` : "Finalizing metadata...");
      
      if (p >= 100) {
        clearInterval(interval);
        setExportStatus(`Successfully exported!`);
        
        setTimeout(() => {
          setShowExportModal(false);
          setExportStatus('');
          setExportProgress(0);
          
          if (destination === 'Local Storage') {
            const a = document.createElement('a');
            a.href = videoUrl || "https://www.w3schools.com/html/mov_bbb.mp4";
            a.download = `fusion_export_${exportQuality}.${exportFormat}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
          } else {
            alert(`Successfully authenticated and published to ${destination}!`);
          }
        }, 1500);
      }
    }, 500);
  };

  // --- AUTH & SETUP ---
  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    if (!authEmail.trim() || !authPassword.trim()) return;
    
    if (!auth) {
      setAuthError("Firebase is not connected. Please check your configuration.");
      return;
    }

    try {
      if (authMode === 'signup') {
        // Create Firebase Account
        const userCred = await createUserWithEmailAndPassword(auth, authEmail, authPassword);
        await updateProfile(userCred.user, { displayName: authName || 'User' });
        
        // Save initial user data to Firestore
        if (db) {
          await setDoc(doc(db, 'artifacts', appId, 'users', userCred.user.uid, 'profile', 'main'), {
            credits: 15,
            plan: 'none',
            name: authName || 'User',
            email: authEmail,
            createdAt: Date.now()
          });
        }

        // Force update local user immediately
        setUser({
          uid: userCred.user.uid,
          name: authName || 'User',
          email: authEmail,
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${authEmail}`
        });
        if (!db) setCredits(15); // Fallback if no DB connected
      } else {
        // Login existing Firebase Account
        await signInWithEmailAndPassword(auth, authEmail, authPassword);
      }
      setShowAuth(false);
      setCurrentView('dashboard');
    } catch (error) {
      setAuthError(error.message.replace('Firebase: ', '')); // Clean up the error message slightly
    }
  };

  const handleLogout = async () => { 
    try {
      if (auth) await signOut(auth);
      setUser(null); 
      setPlan('none'); 
      setCredits(0); 
      setIsEditingProfile(false); 
      setCurrentView('dashboard'); 
    } catch (error) {
      console.error("Logout Error:", error);
    }
  };
  
  const handleOpenEditProfile = () => {
    setEditName(user.name);
    setEditEmail(user.email);
    setIsEditingProfile(true);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!editName.trim() || !editEmail.trim()) return;
    
    try {
      if (auth && auth.currentUser) {
        await updateProfile(auth.currentUser, { displayName: editName });
      }
      setUser({
        ...user,
        name: editName,
        email: editEmail,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${editEmail}`
      });
      setIsEditingProfile(false);
    } catch (error) {
      console.error("Profile Update Error:", error);
    }
  };

  const processPayment = async (creditsToAdd, priceInDollars) => {
    if (!user) {
      setAuthMode('signup');
      setShowAuth(true);
      return;
    }

    const Stripe = await loadStripe();
    
    if (!Stripe) {
      alert("Failed to load Stripe SDK. Please check your internet connection.");
      return;
    }

    // In a production app, you would fetch a Checkout Session ID from your backend here.
    // For this demo, we will simulate the Stripe Checkout redirect and success.
    alert(`Redirecting to Stripe Checkout to pay $${priceInDollars}...`);
    
    setTimeout(async () => {
      alert(`Stripe Payment successful! ${creditsToAdd} Credits added to your account.`);
      
      if (db && user) {
        const profileRef = doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'main');
        const snap = await getDoc(profileRef);
        const currentCredits = snap.exists() ? snap.data().credits || 0 : 0;
        await setDoc(profileRef, { credits: currentCredits + creditsToAdd }, { merge: true });
      } else {
        setCredits(prev => prev + creditsToAdd);
      }
      
      setCurrentView('dashboard');
    }, 1200);
  };

  const handleUpgrade = async (tier = 'plus') => {
    if (!user) {
      setAuthMode('signup');
      setShowAuth(true);
      return;
    }

    const Stripe = await loadStripe();
    
    if (!Stripe) {
      alert("Failed to load Stripe SDK. Please check your internet connection.");
      return;
    }

    let amount = 0;
    if (tier === 'starter') amount = billingCycle === 'yearly' ? 100 : 10;
    if (tier === 'plus') amount = billingCycle === 'yearly' ? 150 : 15;
    if (tier === 'pro') amount = billingCycle === 'yearly' ? 200 : 20;

    // In a production app, you would fetch a Subscription Checkout Session ID from your backend here.
    // For this demo, we will simulate the Stripe Checkout redirect and success.
    alert(`Redirecting to Stripe Checkout to subscribe to the ${tier.toUpperCase()} plan for $${amount}...`);
    
    setTimeout(async () => {
      alert(`Stripe Subscription successful! \nSubscription ID: sub_demo_${Math.floor(Math.random() * 1000000)}`);
      
      let newCredits = 0;
      if (tier === 'starter') newCredits = billingCycle === 'yearly' ? 1500 : 100;
      if (tier === 'plus') newCredits = billingCycle === 'yearly' ? 3000 : 250;
      if (tier === 'pro') newCredits = billingCycle === 'yearly' ? 6000 : 500;

      if (db && user) {
        const profileRef = doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'main');
        await setDoc(profileRef, { plan: tier, credits: newCredits }, { merge: true });
      } else {
        setPlan(tier);
        setCredits(newCredits);
      }
      
      setResolution(tier === 'pro' || tier === 'plus' ? '1080p' : '720p');
      setDuration(tier === 'pro' ? '20s' : (tier === 'plus' ? '10s' : '5s'));
      setCurrentView('dashboard');
    }, 1200);
  };

  useEffect(() => {
    if (!['plus', 'pro'].includes(plan) && mode === 'creator') {
      setMode('standard');
      setCreatorStep(1);
    }
  }, [plan, mode]);

  const handleGenerateScript = async () => {
    if (!user) return setShowAuth(true);
    if (!topic.trim()) return;
    setIsGeneratingScript(true);
    setTimeout(() => {
      setScript(`Title: ${topic}\n\n[Scene 1: 0-3s]\nVisual: Epic establishing shot related to ${topic}.\nVoiceover: "Did you know the truth about ${topic}?"\n\n[Scene 2: 3-7s]\nVisual: Fast-paced dynamic montage.\nVoiceover: "Here are the top facts that will blow your mind..."\n\n[Scene 3: 7-10s]\nVisual: Cinematic text overlay.\nVoiceover: "Subscribe for more!"`);
      setCreatorStep(2);
      setIsGeneratingScript(false);
    }, 1500);
  };

  const handleImageUpload = (e) => {
    if (!user) return setShowAuth(true);
    if (e.target.files && e.target.files[0]) setUploadedImage(URL.createObjectURL(e.target.files[0]));
  };

  const handleVideoUpload = (e) => {
    if (!user) return setShowAuth(true);
    if (plan !== 'pro') return;
    if (e.target.files && e.target.files[0]) setUploadedVideo(URL.createObjectURL(e.target.files[0]));
  };

  const handleGenerate = async () => {
    if (!user) return setShowAuth(true);
    if (credits < 5) return alert("Not enough credits! Please upgrade your plan.");

    const basePrompt = mode === 'creator' ? script : prompt;
    if (mode === 'standard' && inputType === 'text' && !basePrompt.trim()) return;
    if (mode === 'standard' && inputType === 'image' && !uploadedImage) return;
    if (mode === 'standard' && inputType === 'video' && !uploadedVideo) return;
    
    // Deduct credits securely in Firestore
    if (db && user) {
      const profileRef = doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'main');
      await setDoc(profileRef, { credits: credits - 5 }, { merge: true });
    } else {
      setCredits(prev => prev - 5);
    }

    setIsGenerating(true);
    if (mode === 'creator') setCreatorStep(3);
    setVideoUrl(null);
    setProgress(5);
    setStatus("Sending to RunPod GPU...");

    // TODO: Replace with your actual RunPod API URL
    const RUNPOD_URL = "https://YOUR_RUNPOD_URL";

    try {
      // 1. Send the prompt to your RunPod API
      const response = await fetch(`${RUNPOD_URL}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: basePrompt, duration: duration })
      });

      if (!response.ok) throw new Error("Failed to connect to backend");

      const data = await response.json();
      const taskId = data.task_id;

      // 2. Poll the server every 3 seconds to check if it's done
      let currentProgress = 15;
      const interval = setInterval(async () => {
        try {
          const statusRes = await fetch(`${RUNPOD_URL}/status/${taskId}`);
          const statusData = await statusRes.json();

          // Update the UI with "Generating frames...", "Uploading to cloud...", etc.
          setStatus(statusData.status || "Processing on GPU...");

          // Artificially increment progress bar up to 90% while waiting
          if (currentProgress < 90) {
            currentProgress += 5;
            setProgress(currentProgress);
          }

          if (statusData.state === "SUCCESS") {
            clearInterval(interval);
            setProgress(100);
            setStatus("Complete!");
            
            const finalVideoUrl = statusData.video_url;
            setVideoUrl(finalVideoUrl);
            setThumbnails([`https://picsum.photos/seed/${Date.now()}/320/180`]);
            
            // Add to Library securely in Firestore
            const newVideoData = {
              prompt: basePrompt, 
              url: finalVideoUrl, 
              thumbnail: `https://picsum.photos/seed/${Date.now()}/320/180`, 
              date: new Date().toLocaleDateString(),
              timestamp: Date.now()
            };

            if (db && user) {
              const videoId = taskId || Date.now().toString();
              await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'videos', videoId), newVideoData);
            } else {
              setSavedVideos(prev => [{ id: taskId || Date.now().toString(), ...newVideoData }, ...prev]);
            }
            
            if (mode === 'creator') setCreatorStep(4);
            setTimeout(() => setIsGenerating(false), 1000);

          } else if (statusData.state === "FAILED") {
            clearInterval(interval);
            setStatus("Generation Failed");
            setIsGenerating(false);
            alert("The AI engine encountered an error. Your credits have been refunded.");
            
            // Refund credits on fail securely
            if (db && user) {
               const profileRef = doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'main');
               const snap = await getDoc(profileRef);
               const current = snap.exists() ? snap.data().credits || 0 : 0;
               await setDoc(profileRef, { credits: current + 5 }, { merge: true }); 
            } else {
               setCredits(prev => prev + 5); 
            }
          }
        } catch (pollError) {
          console.error("Error polling status:", pollError);
        }
      }, 3000);

    } catch (error) {
      console.error(error);
      setStatus("Connection Failed");
      setIsGenerating(false);
      alert("Failed to reach the RunPod server. Please ensure your backend is running and the URL is correct.");
      
      // Refund credits on connection fail securely
      if (db && user) {
         const profileRef = doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'main');
         const snap = await getDoc(profileRef);
         const current = snap.exists() ? snap.data().credits || 0 : 0;
         await setDoc(profileRef, { credits: current + 5 }, { merge: true });
      } else {
         setCredits(prev => prev + 5); 
      }
    }
  };

  const isGenerateDisabled = () => {
    if (isGenerating) return true;
    if (credits < 5) return true;
    if (mode === 'creator') return !script.trim();
    if (inputType === 'text') return !prompt.trim();
    if (inputType === 'image') return !uploadedImage;
    if (inputType === 'video') return !uploadedVideo;
    return true;
  };

  // --- VIEWS ---
  const renderDashboard = () => (
    <div className="p-5 md:p-6 max-w-[1400px] mx-auto space-y-6 animate-in fade-in duration-500 ease-out">
      {/* Hero Banner */}
      <div className="bg-[#131826] border border-white/5 rounded-2xl p-6 md:p-8 text-white shadow-[0_8px_30px_rgb(0,0,0,0.12)] relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-600/5 via-[#131826] to-amber-600/5 opacity-100 transition-opacity duration-700"></div>
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-orange-500/10 rounded-full blur-3xl pointer-events-none transition-transform duration-1000 group-hover:scale-110 ease-out"></div>
        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="flex flex-wrap items-center justify-center gap-2.5 mb-4">
            <span className="bg-white/5 backdrop-blur-md px-3 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1.5 border border-white/10 text-slate-200 shadow-sm">
              <Grid className="w-3 h-3 text-orange-600" /> {user?.name ? `Welcome back, ${String(user.name).split(' ')[0]}!` : 'Welcome to Fusion AI!'}
            </span>
            <span className="bg-orange-600/10 text-orange-500 px-3 py-1 rounded-full text-[11px] font-semibold border border-orange-600/20 shadow-sm">
              {(!plan || plan === 'none') ? 'Free Plan' : `${String(plan).charAt(0).toUpperCase() + String(plan).slice(1)} Plan`}
            </span>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold mb-3 tracking-tight text-white leading-tight">Create Stunning Videos with AI</h2>
          <p className="text-slate-400 mb-6 max-w-xl mx-auto text-[13px] leading-relaxed">Turn your ideas into cinematic videos in seconds. No editing skills required.</p>
          <div className="flex items-center justify-center gap-3">
            <button onClick={() => setCurrentView('create')} className="focus:outline-none bg-gradient-to-r from-orange-600 to-amber-600 text-white hover:from-orange-700 hover:to-amber-700 transition-all duration-300 hover:-translate-y-[2px] active:scale-[0.98] px-5 py-2.5 rounded-xl text-[13px] font-bold flex items-center gap-2 shadow-lg shadow-orange-600/20 hover:shadow-orange-600/40">
              Start Creating <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button className="focus:outline-none bg-white/5 hover:bg-white/10 border border-white/10 transition-all duration-300 text-slate-200 px-5 py-2.5 rounded-xl text-[13px] font-semibold flex items-center gap-2 shadow-sm hover:shadow-md">
              <Video className="w-3.5 h-3.5 text-slate-400" /> View Tutorials
            </button>
          </div>
        </div>
      </div>

      {/* Recent Generations Section */}
      <div className="pt-2">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2"><Clock className="w-4 h-4 text-orange-500" /> Recent Generations</h3>
          {savedVideos.length > 0 && (
            <button onClick={() => setCurrentView('saved')} className="focus:outline-none text-[12px] text-orange-500 hover:text-orange-400 font-bold transition-colors">View All &rarr;</button>
          )}
        </div>
        
        {savedVideos.length === 0 ? (
          <div className="bg-[#131826] border border-white/5 rounded-3xl p-12 text-center shadow-sm">
            <div className="w-16 h-16 bg-[#0B0F19] border border-white/10 shadow-sm rounded-full flex items-center justify-center mx-auto mb-4">
              <Video className="w-6 h-6 text-slate-600" />
            </div>
            <p className="text-slate-400 text-[13px] mb-5 max-w-sm mx-auto">No videos generated yet. Head over to the Studio to create your first masterpiece.</p>
            <button onClick={() => setCurrentView('create')} className="focus:outline-none bg-white/5 hover:bg-white/10 border border-white/10 text-white px-5 py-2.5 rounded-xl text-[12px] font-bold transition-all shadow-sm">
              Open Studio
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {savedVideos.slice(0, 3).map((video) => (
              <div key={video.id} className="bg-[#131826] border border-white/5 rounded-2xl overflow-hidden shadow-sm hover:border-white/10 transition-all duration-300 hover:-translate-y-1 hover:shadow-md group">
                <div className="relative aspect-video bg-[#0B0F19] overflow-hidden border-b border-white/5">
                  <img src={video.thumbnail} alt="Thumbnail" className="w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700 ease-out" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F19]/80 via-transparent to-transparent opacity-80"></div>
                  <button className="focus:outline-none absolute inset-0 flex items-center justify-center bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20 text-white shadow-lg transform scale-90 group-hover:scale-100 transition-transform duration-300">
                      <Play className="w-5 h-5 ml-1 fill-current" />
                    </div>
                  </button>
                  <span className="absolute bottom-2 right-2 bg-[#0B0F19]/80 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded-md border border-white/10 shadow-sm">
                    {video.date}
                  </span>
                </div>
                <div className="p-4">
                  <p className="text-[13px] text-slate-300 line-clamp-2 font-medium mb-4 h-10 leading-relaxed" title={video.prompt}>
                    "{video.prompt}"
                  </p>
                  <div className="flex items-center gap-2">
                    <button className="focus:outline-none flex-1 bg-[#0B0F19] border border-white/10 hover:bg-white/5 text-slate-300 text-[11px] font-bold py-2 rounded-lg transition-all duration-200 flex items-center justify-center gap-1.5 shadow-sm">
                      <Video className="w-3.5 h-3.5" /> View
                    </button>
                    <button className="focus:outline-none flex-1 bg-orange-600/10 hover:bg-orange-600/20 border border-orange-600/20 text-orange-500 text-[11px] font-bold py-2 rounded-lg transition-all duration-200 flex items-center justify-center gap-1.5 shadow-sm">
                      <Download className="w-3.5 h-3.5" /> Export
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderCreate = () => (
    <div className="p-5 md:p-6 max-w-[1400px] mx-auto animate-in fade-in duration-500 ease-out">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* LEFT COLUMN: Controls */}
        <div className="lg:col-span-4 flex flex-col">
          <div className="bg-[#131826] border border-white/5 rounded-xl p-1.5 flex gap-1 shadow-inner mb-5 shrink-0">
            <button onClick={() => { setMode('standard'); setCreatorStep(1); }} className={`outline-none focus:outline-none appearance-none flex-1 flex items-center justify-center gap-2 py-2 text-[13px] font-semibold rounded-lg transition-all duration-300 ease-in-out ${mode === 'standard' ? 'bg-white/10 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}>
              <Wand2 className="w-3.5 h-3.5" /> Standard
            </button>
            <button onClick={() => { if (!user) { setShowAuth(true); return; } setMode('creator'); }} disabled={Boolean(user && !['plus', 'pro'].includes(plan))} className={`outline-none focus:outline-none appearance-none relative flex-1 flex items-center justify-center gap-2 py-2 text-[13px] font-semibold rounded-lg transition-all duration-300 ease-in-out ${mode === 'creator' ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-md shadow-orange-600/20' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'} ${(user && !['plus', 'pro'].includes(plan)) ? 'opacity-50 cursor-not-allowed' : ''}`}>
              <Layout className="w-3.5 h-3.5" /> Creator Studio
              {user && !['plus', 'pro'].includes(plan) && <Lock className="w-3 h-3 absolute top-1.5 right-1.5 text-slate-500" />}
            </button>
          </div>

          <div key={mode} className="animate-in fade-in zoom-in-[0.98] duration-500 ease-out flex-1">
          {mode === 'creator' ? (
            <div className="bg-[#131826] border border-white/5 rounded-2xl p-5 shadow-sm relative overflow-hidden group h-full">
              <div className="absolute top-0 right-0 bg-gradient-to-l from-amber-600 to-orange-600 text-[9px] font-bold px-3 py-1 rounded-bl-xl tracking-wider shadow-sm text-white z-10">Plus / Pro</div>
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-white tracking-tight"><Smartphone className="w-4 h-4 text-orange-600" /> Shorts Builder</h2>
              
              <div className={`transition-all duration-500 ease-out ${creatorStep >= 1 ? 'opacity-100 translate-y-0' : 'opacity-40 blur-[2px] translate-y-4'}`}>
                <div className="flex items-center gap-2.5 mb-2">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-300 shadow-sm ${creatorStep > 1 ? 'bg-emerald-600/20 text-emerald-500 border border-emerald-600/30' : 'bg-orange-600/20 text-orange-500 border border-orange-600/30'}`}>
                    {creatorStep > 1 ? <CheckCircle className="w-3 h-3" /> : '1'}
                  </span>
                  <label className="text-[13px] font-semibold text-slate-300">Enter Topic</label>
                </div>
                <input type="text" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. 5 facts about Black Holes" className="w-full bg-[#0B0F19] hover:bg-[#0B0F19]/80 border border-white/10 rounded-xl p-3 text-[13px] text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-all mb-3 shadow-sm" disabled={creatorStep > 1} />
                {creatorStep === 1 && (
                  <button onClick={handleGenerateScript} disabled={isGeneratingScript || !topic.trim()} className="focus:outline-none w-full bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 font-semibold py-2.5 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 text-[13px] shadow-sm hover:shadow-md hover:-translate-y-[1px]">
                    {isGeneratingScript ? <Loader2 className="w-3.5 h-3.5 animate-spin text-orange-600" /> : <PenTool className="w-3.5 h-3.5 text-slate-400" />} Write Script
                  </button>
                )}
              </div>

              {creatorStep >= 2 && (
                <div className="mt-6 transition-all duration-500 animate-in slide-in-from-bottom-4 ease-out">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-300 shadow-sm ${creatorStep > 2 ? 'bg-emerald-600/20 text-emerald-500 border border-emerald-600/30' : 'bg-orange-600/20 text-orange-500 border border-orange-600/30'}`}>
                    {creatorStep > 2 ? <CheckCircle className="w-3 h-3" /> : '2'}
                  </span>
                  <label className="text-[13px] font-semibold text-slate-300">AI Script & Prompt</label>
                  </div>
                  <textarea value={script} onChange={(e) => setScript(e.target.value)} className="w-full h-32 bg-[#0B0F19] hover:bg-[#0B0F19]/80 border border-white/10 rounded-xl p-3 text-[13px] text-slate-200 focus:outline-none focus:border-orange-500 resize-none mb-4 font-mono leading-relaxed shadow-sm transition-all" disabled={creatorStep > 2} />
                  
                  <div className="bg-[#0B0F19]/50 border border-white/5 rounded-xl p-4 mb-4 space-y-3">
                    <h4 className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5"><Sparkles className="w-3 h-3 text-orange-600" /> Premium Enhancements</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-medium text-slate-400 mb-1.5 flex items-center gap-1"><Mic className="w-3 h-3" /> AI Voice</label>
                        <select value={voice} onChange={(e) => setVoice(e.target.value)} disabled={creatorStep > 2} className="focus:outline-none w-full bg-[#131826] border border-white/10 rounded-lg py-2 px-2.5 text-[12px] text-slate-300 focus:border-orange-500 transition-all shadow-sm cursor-pointer hover:border-white/20">
                          <option value="elevenlabs-adam">Adam (Male)</option>
                          <option value="elevenlabs-rachel">Rachel (Female)</option>
                          <option value="none">No Voiceover</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-400 mb-1.5 flex items-center gap-1"><User className="w-3 h-3" /> Avatar</label>
                        <button onClick={() => setEnableAvatar(!enableAvatar)} disabled={creatorStep > 2} className={`focus:outline-none w-full py-2 px-2.5 rounded-lg text-[12px] font-medium transition-all duration-300 flex items-center justify-between border shadow-sm ${enableAvatar ? 'bg-orange-600/10 border-orange-600/20 text-orange-500' : 'bg-[#131826] border-white/10 text-slate-400 hover:border-white/20'}`}>
                          {enableAvatar ? 'Enabled' : 'Disabled'}
                          <div className={`w-6 h-3 rounded-full relative transition-colors duration-300 ${enableAvatar ? 'bg-orange-600' : 'bg-slate-700'}`}>
                            <div className={`absolute top-[1.5px] left-[1.5px] w-2 h-2 rounded-full bg-white transition-transform duration-300 shadow-sm ${enableAvatar ? 'translate-x-3' : 'translate-x-0'}`}></div>
                          </div>
                        </button>
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-400 mb-1.5 flex items-center gap-1"><Monitor className="w-3 h-3" /> Aspect</label>
                        <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)} disabled={creatorStep > 2 || !['plus', 'pro'].includes(plan)} className="focus:outline-none w-full bg-[#131826] border border-white/10 rounded-lg py-2 px-2.5 text-[12px] text-slate-300 focus:border-orange-500 transition-all shadow-sm cursor-pointer hover:border-white/20 disabled:opacity-50">
                          <option value="16:9">16:9</option>
                          <option value="9:16" disabled={!['plus', 'pro'].includes(plan)}>9:16</option>
                          <option value="1:1" disabled={!['plus', 'pro'].includes(plan)}>1:1</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {creatorStep === 2 && (
                     <button onClick={handleGenerate} disabled={isGenerateDisabled()} className="focus:outline-none w-full bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 text-white font-bold py-3.5 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-orange-600/20 hover:shadow-orange-600/40 hover:-translate-y-[1px] disabled:translate-y-0 disabled:shadow-none text-[13px]">
                       {isGenerating ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</> : credits < 5 ? <><Zap className="w-4 h-4" /> Not Enough Credits</> : <><Video className="w-4 h-4" /> Generate Video</>}
                     </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-[#131826] border border-white/5 rounded-2xl p-5 shadow-sm h-full">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-white tracking-tight">Video Prompt</h2>
              
              <div className="mb-4">
                <label className="block text-[11px] font-semibold text-slate-400 mb-1.5 flex items-center gap-1">
                  <Palette className="w-3 h-3" /> Style Template
                </label>
                <select 
                  value={activeStyle} 
                  onChange={(e) => setActiveStyle(e.target.value)} 
                  className="focus:outline-none outline-none w-full bg-[#0B0F19] hover:bg-[#0B0F19]/80 border border-white/10 rounded-xl py-2.5 px-3 text-[13px] text-slate-200 focus:border-orange-500 transition-all cursor-pointer shadow-sm"
                >
                  <option value="">None (Auto-detect)</option>
                  {videoStyles.map(style => (
                    <option key={style.id} value={style.name}>{style.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex bg-[#0B0F19] p-1 rounded-xl border border-white/5 mb-4 shadow-inner">
                <button onClick={() => setInputType('text')} className={`outline-none focus:outline-none appearance-none flex-1 py-2 text-[12px] font-semibold rounded-lg transition-all duration-300 ease-in-out flex items-center justify-center gap-1.5 ${inputType === 'text' ? 'bg-white/10 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}>
                  <Type className="w-3.5 h-3.5" /> Text
                </button>
                <button onClick={() => setInputType('image')} className={`outline-none focus:outline-none appearance-none flex-1 py-2 text-[12px] font-semibold rounded-lg transition-all duration-300 ease-in-out flex items-center justify-center gap-1.5 ${inputType === 'image' ? 'bg-white/10 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}>
                  <ImagePlus className="w-3.5 h-3.5" /> Image
                </button>
                <button onClick={() => setInputType('video')} className={`outline-none focus:outline-none appearance-none flex-1 py-2 text-[12px] font-semibold rounded-lg transition-all duration-300 ease-in-out flex items-center justify-center gap-1.5 ${inputType === 'video' ? 'bg-white/10 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}>
                  <Film className="w-3.5 h-3.5" /> Video
                  {plan !== 'pro' && <Lock className="w-3 h-3 text-slate-500" />}
                </button>
              </div>

              <div key={inputType} className="animate-in fade-in duration-300 ease-out">
                {inputType === 'text' && (
                  <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="A cinematic drone shot..." className="w-full h-28 bg-[#0B0F19] hover:bg-[#0B0F19]/80 border border-white/10 rounded-xl p-3 text-[13px] text-slate-200 placeholder-slate-500 focus:outline-none focus:border-orange-500 resize-none transition-all leading-relaxed shadow-sm" />
                )}
                
                {inputType === 'image' && (
                  <div className="w-full h-28 bg-[#0B0F19] border-2 border-dashed border-white/20 rounded-xl flex flex-col items-center justify-center text-slate-500 hover:bg-orange-600/5 hover:border-orange-600/50 hover:text-orange-500 transition-all duration-300 relative overflow-hidden cursor-pointer group">
                      {uploadedImage ? (
                        <>
                          <img src={uploadedImage} alt="Uploaded" className="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-500" />
                          <div className="relative z-10 bg-[#131826]/90 backdrop-blur-md p-2 rounded-lg text-slate-200 text-[11px] font-bold flex items-center shadow-lg border border-white/10"><CheckCircle className="w-3.5 h-3.5 text-emerald-500 inline mr-1.5" /> Selected</div>
                          <input type="file" accept="image/*" onChange={handleImageUpload} className="outline-none focus:outline-none absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20" />
                        </>
                      ) : (
                        <>
                          <Upload className="w-8 h-8 mb-2 text-slate-500 group-hover:text-orange-600 transition-colors" />
                          <span className="text-[12px] font-semibold">Upload starting frame</span>
                          <span className="text-[10px] text-slate-500 mt-1">PNG, JPG</span>
                          <input type="file" accept="image/*" onChange={handleImageUpload} className="outline-none focus:outline-none absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                        </>
                      )}
                  </div>
                )}

                {inputType === 'video' && (
                  <div className="w-full h-28 bg-[#0B0F19] border-2 border-dashed border-white/20 rounded-xl flex flex-col items-center justify-center text-slate-500 hover:bg-orange-600/5 hover:border-orange-600/50 hover:text-orange-500 transition-all duration-300 relative overflow-hidden cursor-pointer group">
                      {plan !== 'pro' ? (
                         <div className="text-center p-3">
                           <Lock className="w-6 h-6 mx-auto mb-2 text-slate-500" />
                           <p className="text-[11px] font-bold text-slate-300 mb-2">Pro feature</p>
                           <button onClick={() => setCurrentView('pricing')} className="focus:outline-none text-[10px] bg-orange-600/10 hover:bg-orange-600/20 text-orange-500 border border-orange-600/20 px-3 py-1.5 rounded-lg font-bold transition-colors">Upgrade</button>
                         </div>
                      ) : uploadedVideo ? (
                        <>
                          <video src={uploadedVideo} className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-500" muted loop autoPlay />
                          <div className="relative z-10 bg-[#131826]/90 backdrop-blur-md p-2 rounded-lg text-slate-200 text-[11px] font-bold flex items-center shadow-lg border border-white/10"><CheckCircle className="w-3.5 h-3.5 text-emerald-500 inline mr-1.5" /> Selected</div>
                          <input type="file" accept="video/*" onChange={handleVideoUpload} className="outline-none focus:outline-none absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20" />
                        </>
                      ) : (
                        <>
                          <Upload className="w-8 h-8 mb-2 text-slate-500 group-hover:text-orange-600 transition-colors" />
                          <span className="text-[12px] font-semibold">Upload source video</span>
                          <span className="text-[10px] text-slate-500 mt-1">MP4, MOV</span>
                          <input type="file" accept="video/*" onChange={handleVideoUpload} className="outline-none focus:outline-none absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                        </>
                      )}
                  </div>
                )}
                
                {(inputType === 'image' || inputType === 'video') && (
                  <div className="mt-4">
                    <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Describe styling or animation..." className="w-full h-16 bg-[#0B0F19] hover:bg-[#0B0F19]/80 border border-white/10 rounded-xl p-3 text-[13px] text-slate-200 placeholder-slate-500 focus:outline-none focus:border-orange-500 resize-none transition-all shadow-sm" />
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
                  <div className="bg-[#0B0F19] border border-white/5 p-2.5 rounded-xl">
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1.5 flex items-center gap-1"><ImagePlus className="w-3 h-3" /> Resolution</label>
                    <select value={resolution} onChange={(e) => setResolution(e.target.value)} disabled={!['plus', 'pro'].includes(plan)} className="focus:outline-none w-full bg-[#131826] border border-white/10 rounded-lg py-1.5 px-2 text-[12px] text-slate-300 focus:border-orange-500 transition-colors shadow-sm cursor-pointer hover:border-white/20">
                      <option value="720p">720p (Base)</option>
                      <option value="1080p">1080p (Plus/Pro)</option>
                    </select>
                  </div>
                  <div className="bg-[#0B0F19] border border-white/5 p-2.5 rounded-xl">
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1.5 flex items-center gap-1"><Clock className="w-3 h-3" /> Duration</label>
                    <select value={duration} onChange={(e) => setDuration(e.target.value)} disabled={!['plus', 'pro'].includes(plan)} className="focus:outline-none w-full bg-[#131826] border border-white/10 rounded-lg py-1.5 px-2 text-[12px] text-slate-300 focus:border-orange-500 transition-colors shadow-sm cursor-pointer hover:border-white/20">
                      <option value="5s">5 Seconds</option>
                      <option value="10s" disabled={!['plus', 'pro'].includes(plan)}>10s (Plus/Pro)</option>
                      <option value="20s" disabled={plan !== 'pro'}>20s (Pro Only)</option>
                    </select>
                  </div>
                  <div className="bg-[#0B0F19] border border-white/5 p-2.5 rounded-xl">
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1.5 flex items-center gap-1"><Monitor className="w-3 h-3" /> Aspect</label>
                    <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)} disabled={!['plus', 'pro'].includes(plan)} className="focus:outline-none w-full bg-[#131826] border border-white/10 rounded-lg py-1.5 px-2 text-[12px] text-slate-300 focus:border-orange-500 transition-colors shadow-sm cursor-pointer hover:border-white/20 disabled:opacity-50">
                      <option value="16:9">16:9</option>
                      <option value="9:16" disabled={!['plus', 'pro'].includes(plan)}>9:16</option>
                      <option value="1:1" disabled={!['plus', 'pro'].includes(plan)}>1:1</option>
                    </select>
                  </div>
                </div>

              <button onClick={handleGenerate} disabled={isGenerateDisabled()} className="focus:outline-none w-full mt-5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 text-white font-bold py-3.5 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-orange-600/20 hover:shadow-orange-600/40 hover:-translate-y-[1px] disabled:translate-y-0 disabled:shadow-none text-[13px]">
                {isGenerating ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</> : credits < 5 ? <><Zap className="w-4 h-4" /> Not Enough Credits</> : <><Wand2 className="w-4 h-4" /> Generate Video</>}
              </button>
            </div>
          )}
          </div>
        </div>

        {/* Right Column: Output Viewer */}
        <div className="lg:col-span-8 flex flex-col">
          <div className="bg-[#131826] border border-white/5 rounded-2xl p-2 flex-grow flex flex-col min-h-[450px] shadow-sm relative overflow-hidden">
            <div className="px-5 py-3 flex justify-between items-center bg-[#131826] absolute top-0 w-full z-10 rounded-t-2xl border-b border-white/5">
              <span className="text-[13px] font-bold text-white flex items-center gap-2"><Video className="w-4 h-4 text-orange-600" /> Studio Viewer</span>
              {videoUrl && <button onClick={() => setShowExportModal(true)} className="focus:outline-none text-[11px] bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors shadow-md font-bold border-none"><Download className="w-3 h-3" /> Export</button>}
            </div>

            <div className="flex-grow flex items-center justify-center bg-[#0B0F19] mt-12 mb-2 mx-2 rounded-xl relative overflow-hidden group shadow-inner border border-white/5">
              {!isGenerating && !videoUrl && (
                <div className="text-center p-6">
                  <div className="w-16 h-16 bg-[#131826] border-2 border-dashed border-white/10 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner"><Video className="w-6 h-6 text-slate-600" /></div>
                  <h3 className="text-white font-bold mb-1 text-lg tracking-tight">Ready for generation</h3>
                  <p className="text-slate-500 text-[13px]">Configure your prompt to begin.</p>
                </div>
              )}

              {isGenerating && (
                <div className="w-full max-w-sm px-6 text-center animate-in fade-in duration-500">
                  <Loader2 className="w-10 h-10 text-orange-600 animate-spin mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-white mb-2 tracking-tight">{status}</h3>
                  <p className="text-[13px] text-slate-400 mb-6">Please wait while the AI works its magic.</p>
                  <div className="w-full bg-[#131826] rounded-full h-2 overflow-hidden shadow-inner border border-white/5">
                    <div className="bg-gradient-to-r from-orange-600 to-amber-600 h-full rounded-full transition-all duration-500 ease-out" style={{ width: `${progress}%` }}></div>
                  </div>
                </div>
              )}

              {videoUrl && !isGenerating && (
                <div className="w-full h-full relative flex flex-col bg-black overflow-hidden animate-in fade-in zoom-in-95 duration-500 ease-out">
                  <div className="relative flex-grow flex items-center justify-center p-3 h-full">
                    <video 
                      ref={videoRef} 
                      src={videoUrl} 
                      controls={true} 
                      autoPlay 
                      loop 
                      className="max-h-full max-w-full object-contain rounded-lg shadow-[0_0_40px_rgba(0,0,0,0.5)] ring-1 ring-white/10" 
                    />
                    
                    {enableSubtitles && mode === 'creator' && (
                      <div className="absolute bottom-12 left-0 right-0 text-center pointer-events-none drop-shadow-[0_4px_30px_rgba(0,0,0,0.8)] transition-opacity duration-300">
                        <span className="bg-slate-900/80 backdrop-blur-md text-yellow-400 font-black px-4 py-2 rounded-lg text-lg border border-white/10 uppercase tracking-widest shadow-2xl inline-block transform scale-105">{topic ? `THE TRUTH ABOUT ${topic.toUpperCase()}...` : "EPIC CINEMATIC SHOT..."}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderBuyCredits = () => (
    <div className="p-6 md:p-12 max-w-5xl mx-auto animate-in fade-in duration-500 ease-out">
      <div className="text-center mb-10 relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-orange-600/5 rounded-full blur-[100px] pointer-events-none"></div>
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-4 relative z-10 tracking-tight">Buy Credits</h2>
        <p className="text-slate-400 text-[13px] relative z-10 max-w-xl mx-auto">Top up your account instantly. 10 Credits = 2 Video Generations.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 relative z-10">
        {[
          { credits: 10, videos: 2, price: 1, popular: false },
          { credits: 50, videos: 10, price: 5, popular: true },
          { credits: 100, videos: 20, price: 20, popular: false },
          { credits: 500, videos: 100, price: 50, popular: false },
        ].map((pkg, i) => (
          <div key={i} className={`bg-[#131826] border ${pkg.popular ? 'border-orange-500/50 shadow-[0_0_20px_rgba(234,88,12,0.15)]' : 'border-white/5 hover:border-white/10'} rounded-2xl p-6 flex flex-col shadow-sm transition-all duration-300 hover:-translate-y-1 group relative`}>
            {pkg.popular && <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-orange-600 to-amber-600 text-white text-[9px] font-bold px-3 py-1 rounded-full uppercase tracking-widest shadow-md">Most Popular</div>}
            
            <div className="flex items-center justify-center w-12 h-12 bg-orange-600/10 text-orange-500 rounded-xl mb-4 group-hover:scale-110 transition-transform duration-300">
              <Zap className="w-6 h-6" />
            </div>
            
            <h3 className="text-2xl font-black text-white mb-1 tracking-tight">{pkg.credits} <span className="text-[13px] font-medium text-slate-500">Credits</span></h3>
            <p className="text-slate-400 text-[12px] mb-6">Generates {pkg.videos} videos</p>
            
            <div className="mt-auto">
              <button onClick={() => processPayment(pkg.credits, pkg.price)} className={`focus:outline-none w-full py-3 rounded-xl font-bold transition-all duration-200 text-[13px] ${pkg.popular ? 'bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white shadow-lg shadow-orange-600/30' : 'bg-white/10 hover:bg-white/20 text-white'}`}>
                Buy for ${pkg.price}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderPricing = () => (
    <div className="p-6 md:p-12 max-w-5xl mx-auto animate-in fade-in duration-500 ease-out">
      <div className="text-center mb-10 relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-orange-600/5 rounded-full blur-[100px] pointer-events-none"></div>
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-4 relative z-10 tracking-tight">Simple, transparent pricing</h2>
        <p className="text-slate-400 text-[13px] relative z-10 max-w-xl mx-auto">Choose the perfect plan to scale your content creation. No hidden fees.</p>
      </div>

      <div className="flex justify-center mb-10 relative z-10">
        <div className="bg-[#131826] p-1.5 rounded-full border border-white/5 flex items-center shadow-inner">
          <button 
            onClick={() => setBillingCycle('monthly')}
            className={`focus:outline-none px-5 py-2 rounded-full text-[13px] font-bold transition-all duration-300 ease-in-out ${billingCycle === 'monthly' ? 'bg-white/10 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
          >
            Monthly
          </button>
          <button 
            onClick={() => setBillingCycle('yearly')}
            className={`focus:outline-none px-5 py-2 rounded-full text-[13px] font-bold transition-all duration-300 ease-in-out flex items-center gap-2 ${billingCycle === 'yearly' ? 'bg-white/10 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
          >
            Yearly <span className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${billingCycle === 'yearly' ? 'bg-orange-600/20 text-orange-500 border-orange-600/30' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'}`}>Save ~16%</span>
          </button>
        </div>
      </div>

      <div className="bg-[#131826] border border-white/5 rounded-2xl p-5 mb-10 shadow-sm hover:shadow-md flex flex-col md:flex-row items-center justify-between gap-5 relative overflow-hidden group transition-all duration-300">
        <div className="absolute inset-0 bg-gradient-to-r from-orange-600/5 to-transparent opacity-60 group-hover:opacity-100 transition-opacity duration-500"></div>
        <div className="relative z-10 flex items-center gap-4">
          <div className="bg-orange-600/10 p-3.5 rounded-xl border border-orange-600/20 shadow-sm text-orange-600 group-hover:scale-110 transition-transform duration-300 ease-out">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-[15px] font-bold text-white mb-1 tracking-tight">Need a quick top-up?</h3>
            <p className="text-[13px] text-slate-400">Buy Credits on demand. Top up your account starting at just <span className="text-white font-bold">$1.00</span>. No subscription required.</p>
          </div>
        </div>
        <button onClick={() => setCurrentView('buy-credits')} className="focus:outline-none relative z-10 whitespace-nowrap bg-white hover:bg-slate-200 text-[#0B0F19] font-bold py-3 px-5 rounded-xl border border-white transition-all duration-200 shadow-md hover:shadow-lg hover:-translate-y-[1px] text-[13px]">
          View Credit Packages
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* STARTER PLAN */}
        <div className="bg-[#131826] border border-white/5 rounded-2xl p-8 flex flex-col shadow-sm hover:border-white/10 transition-all duration-300 hover:-translate-y-2 hover:shadow-xl group">
          <h3 className="text-lg font-bold text-white mb-2">Starter</h3>
          <div className="text-2xl text-white mb-2 tracking-tight">${billingCycle === 'yearly' ? '100' : '10'}<span className="text-[13px] text-slate-500">/{billingCycle === 'yearly' ? 'yr' : 'mo'}</span></div>
          <div className="h-5 mb-5 flex items-center">
            {billingCycle === 'yearly' && <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-md border border-emerald-500/20">You save $20 a year</span>}
          </div>
          <ul className="space-y-3.5 mb-8 flex-grow">
            <li className="flex items-center gap-2.5 text-[13px] text-slate-300"><Check className="w-4 h-4 text-orange-600 shrink-0" /> <span className="font-bold text-white">{billingCycle === 'yearly' ? '1,500 Credits' : '100 Credits'}</span> ({billingCycle === 'yearly' ? '300' : '20'} videos)</li>
            <li className="flex items-center gap-2.5 text-[13px] text-slate-300"><Check className="w-4 h-4 text-orange-600 shrink-0" /> 720p base resolution</li>
            <li className="flex items-center gap-2.5 text-[13px] text-slate-300"><Check className="w-4 h-4 text-orange-600 shrink-0" /> 5 seconds max duration</li>
          </ul>
          <button disabled={Boolean(user && plan === 'starter')} onClick={() => handleUpgrade('starter')} className={`focus:outline-none w-full py-3.5 rounded-xl font-bold transition-all duration-200 text-[13px] ${user && plan === 'starter' ? 'bg-white/5 text-slate-500 border border-white/5' : 'bg-white/10 border border-white/10 text-white hover:bg-white/20 shadow-md hover:shadow-lg hover:-translate-y-[1px]'}`}>
            {!user ? 'Starter' : (plan === 'starter' ? 'Current Plan' : 'Starter')}
          </button>
        </div>
        
        {/* PLUS PLAN */}
        <div className="bg-orange-600/10 border border-orange-600/20 rounded-2xl p-8 flex flex-col relative shadow-md transform md:-translate-y-4 hover:-translate-y-6 transition-transform duration-500 ease-out">
          <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent rounded-2xl pointer-events-none"></div>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-orange-600 to-amber-600 text-white text-[10px] font-bold px-4 py-1 rounded-full uppercase tracking-widest shadow-md border border-orange-500">Most Popular</div>
          <h3 className="text-lg font-bold text-orange-500 mb-2 flex items-center gap-2">Plus</h3>
          <div className="text-2xl text-white mb-2 tracking-tight">${billingCycle === 'yearly' ? '150' : '15'}<span className="text-[13px] text-orange-500/80">/{billingCycle === 'yearly' ? 'yr' : 'mo'}</span></div>
          <div className="h-5 mb-5 flex items-center">
            {billingCycle === 'yearly' && <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-md border border-emerald-500/20">You save $30 a year</span>}
          </div>
          <ul className="space-y-3.5 mb-8 flex-grow relative z-10">
            <li className="flex items-center gap-2.5 text-[13px] text-orange-200/80">
              <Check className="w-4 h-4 text-orange-600 shrink-0" /> 
              <span className="font-bold text-white">{billingCycle === 'yearly' ? '3,000 Credits' : '250 Credits'}</span>/{billingCycle === 'yearly' ? 'yr' : 'mo'} ({billingCycle === 'yearly' ? '600' : '50'} videos)
            </li>
            <li className="flex items-center gap-2.5 text-[13px] text-orange-200/80"><Check className="w-4 h-4 text-orange-600 shrink-0" /> 1080p resolution</li>
            <li className="flex items-center gap-2.5 text-[13px] text-orange-200/80"><Check className="w-4 h-4 text-orange-600 shrink-0" /> 10 seconds max duration</li>
            <li className="flex items-center gap-2.5 text-[13px] font-bold text-orange-200"><Check className="w-4 h-4 text-orange-600 shrink-0" /> Creator Studio</li>
          </ul>
          
          <button disabled={Boolean(user && plan === 'plus')} onClick={() => handleUpgrade('plus')} className={`focus:outline-none w-full py-3.5 rounded-xl font-bold transition-all duration-200 relative z-10 text-[13px] ${user && plan === 'plus' ? 'bg-orange-600/20 text-orange-600/50 border border-orange-600/30' : 'bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white shadow-lg shadow-orange-600/30 hover:shadow-orange-600/50 hover:-translate-y-[1px]'}`}>
            {user && plan === 'plus' ? 'Current Plan' : 'Upgrade to Plus'}
          </button>
        </div>

        {/* PRO PLAN */}
        <div className="bg-[#131826] border border-white/5 rounded-2xl p-8 flex flex-col shadow-sm hover:border-white/10 transition-all duration-300 hover:-translate-y-2 hover:shadow-xl group">
          <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2"><Zap className="w-4 h-4 text-purple-500 group-hover:scale-110 transition-transform" /> Pro</h3>
          <div className="text-2xl text-white mb-2 tracking-tight">${billingCycle === 'yearly' ? '200' : '20'}<span className="text-[13px] text-slate-500">/{billingCycle === 'yearly' ? 'yr' : 'mo'}</span></div>
          <div className="h-5 mb-5 flex items-center">
            {billingCycle === 'yearly' && <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-md border border-emerald-500/20">You save $40 a year</span>}
          </div>
          <ul className="space-y-3.5 mb-8 flex-grow">
            <li className="flex items-center gap-2.5 text-[13px] text-slate-300">
              <Check className="w-4 h-4 text-purple-500 shrink-0" /> 
              <span className="font-bold text-white">{billingCycle === 'yearly' ? '6,000 Credits' : '500 Credits'}</span>/{billingCycle === 'yearly' ? 'yr' : 'mo'} ({billingCycle === 'yearly' ? '1,200' : '100'} videos)
            </li>
            <li className="flex items-center gap-2.5 text-[13px] text-slate-300"><Check className="w-4 h-4 text-purple-500 shrink-0" /> 4K Upscaling</li>
            <li className="flex items-center gap-2.5 text-[13px] text-slate-300"><Check className="w-4 h-4 text-purple-500 shrink-0" /> 20 seconds max duration</li>
            <li className="flex items-center gap-2.5 text-[13px] font-bold text-white"><Check className="w-4 h-4 text-purple-500 shrink-0" /> Video-to-Video Gen</li>
          </ul>

          <button disabled={Boolean(user && plan === 'pro')} onClick={() => handleUpgrade('pro')} className={`focus:outline-none w-full py-3.5 rounded-xl font-bold transition-all duration-200 text-[13px] ${user && plan === 'pro' ? 'bg-white/5 text-slate-500 border border-white/5' : 'bg-purple-600 hover:bg-purple-700 text-white shadow-[0_4px_14px_0_rgb(147,51,234,0.39)] hover:shadow-[0_6px_20px_rgba(147,51,234,0.23)] hover:-translate-y-[1px]'}`}>
            {user && plan === 'pro' ? 'Current Plan' : 'Upgrade to Pro'}
          </button>
        </div>
      </div>
      
      {/* Payment Security Note */}
      <div className="mt-12 text-center flex items-center justify-center gap-3 text-slate-500 text-[11px] font-medium">
        <span className="flex items-center gap-1.5"><Lock className="w-3 h-3" /> 256-bit Encryption</span>
        <span>•</span>
        <span>Secure payments by Stripe</span>
        <span>•</span>
        <span>Cancel anytime</span>
      </div>
    </div>
  );

  const renderSavedContent = () => (
    <div className="p-6 md:p-10 max-w-7xl mx-auto animate-in fade-in duration-500 ease-out">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-extrabold text-white mb-1 flex items-center gap-2 tracking-tight">
            <Bookmark className="w-6 h-6 text-orange-600" /> Library
          </h2>
          <p className="text-[13px] text-slate-400">View and download your previously generated videos.</p>
        </div>
        <span className="bg-[#131826] border border-white/5 text-slate-300 text-[11px] font-bold px-3 py-1.5 rounded-lg shadow-sm">
          {savedVideos.length} Video{savedVideos.length !== 1 ? 's' : ''}
        </span>
      </div>

      {savedVideos.length === 0 ? (
        <div className="bg-[#131826] border border-white/5 rounded-3xl p-16 text-center shadow-sm">
          <div className="w-20 h-20 bg-[#0B0F19] border border-white/10 shadow-sm rounded-full flex items-center justify-center mx-auto mb-5">
            <Video className="w-8 h-8 text-slate-500" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2 tracking-tight">Your library is empty</h3>
          <p className="text-slate-400 mb-6 max-w-md mx-auto text-[13px]">You haven't generated any videos yet. Head over to the Studio to create your first masterpiece.</p>
          <button onClick={() => setCurrentView('create')} className="focus:outline-none bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white px-6 py-3 rounded-xl text-[13px] font-bold transition-all duration-200 shadow-lg shadow-orange-600/30 hover:shadow-orange-600/50 hover:-translate-y-[1px]">
            Go to Studio
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {savedVideos.map((video) => (
            <div key={video.id} className="bg-[#131826] border border-white/5 rounded-2xl overflow-hidden shadow-sm hover:border-white/10 transition-all duration-300 hover:-translate-y-1 hover:shadow-md group">
              <div className="relative aspect-video bg-[#0B0F19] overflow-hidden border-b border-white/5">
                <img src={video.thumbnail} alt="Thumbnail" className="w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700 ease-out" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F19]/80 via-transparent to-transparent opacity-80"></div>
                <button className="focus:outline-none absolute inset-0 flex items-center justify-center bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20 text-white shadow-lg transform scale-90 group-hover:scale-100 transition-transform duration-300">
                    <Play className="w-5 h-5 ml-1 fill-current" />
                  </div>
                </button>
                <span className="absolute bottom-2 right-2 bg-[#0B0F19]/80 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded-md border border-white/10 shadow-sm">
                  {video.date}
                </span>
              </div>
              <div className="p-4">
                <p className="text-[13px] text-slate-300 line-clamp-2 font-medium mb-4 h-10 leading-relaxed" title={video.prompt}>
                  "{video.prompt}"
                </p>
                <div className="flex items-center gap-2">
                  <button className="focus:outline-none flex-1 bg-[#0B0F19] border border-white/10 hover:bg-white/5 text-slate-300 text-[11px] font-bold py-2 rounded-lg transition-all duration-200 flex items-center justify-center gap-1.5 shadow-sm">
                    <Video className="w-3.5 h-3.5" /> View
                  </button>
                  <button className="focus:outline-none flex-1 bg-orange-600/10 hover:bg-orange-600/20 border border-orange-600/20 text-orange-500 text-[11px] font-bold py-2 rounded-lg transition-all duration-200 flex items-center justify-center gap-1.5 shadow-sm">
                    <Download className="w-3.5 h-3.5" /> Export
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="flex h-screen bg-[#0B0F19] text-slate-100 font-sans overflow-hidden selection:bg-orange-600/20 text-[13px]">
      {/* SIDEBAR NAVIGATION (Desktop) */}
      <aside className="w-56 bg-[#0B0F19] border-r border-white/5 flex-col h-full hidden lg:flex shrink-0 relative z-20 shadow-2xl">
        <div className="p-5 flex items-center gap-3 mb-4">
          <div className="bg-gradient-to-br from-purple-600 via-pink-500 to-orange-500 p-2 rounded-xl shadow-lg shadow-pink-500/30 border border-white/10">
            <span className="text-white font-black italic flex items-center justify-center w-4 h-4 text-base">F</span>
          </div>
          <h1 className="font-bold text-lg text-white leading-tight tracking-tight">Fusion AI<br/><span className="text-[10px] font-medium text-slate-400 tracking-normal">Content Creator</span></h1>
        </div>
        
        <div className="flex-1 overflow-y-auto px-3 space-y-6 scrollbar-hide">
          {/* OVERVIEW */}
          <div className="space-y-0.5">
            <h3 className="text-[10px] font-bold text-slate-500 tracking-wider mb-2 ml-3">Overview</h3>
            <button onClick={() => setCurrentView('dashboard')} className={`focus:outline-none w-full flex items-center gap-3 px-4 py-2 rounded-xl text-[13px] font-semibold transition-all duration-200 ${currentView === 'dashboard' ? 'bg-white/10 text-white shadow-sm' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}`}>
              <Home className="w-4 h-4" /> Dashboard
            </button>
            <button onClick={() => setCurrentView('create')} className={`focus:outline-none w-full flex items-center gap-3 px-4 py-2 rounded-xl text-[13px] font-semibold transition-all duration-200 ${currentView === 'create' ? 'bg-white/10 text-white shadow-sm' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}`}>
              <Wand2 className="w-4 h-4" /> Create
            </button>
            <button onClick={() => { if (!user) setShowAuth(true); else setCurrentView('saved'); }} className={`focus:outline-none w-full flex items-center gap-3 px-4 py-2 rounded-xl text-[13px] font-semibold transition-all duration-200 ${currentView === 'saved' ? 'bg-white/10 text-white shadow-sm' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}`}>
              <Bookmark className="w-4 h-4" /> Library
            </button>
            <button onClick={() => { if (!user) setShowAuth(true); }} className="focus:outline-none w-full flex items-center gap-3 px-4 py-2 rounded-xl text-[13px] font-semibold text-slate-400 hover:bg-white/5 hover:text-slate-200 transition-all duration-200">
              <Clock className="w-4 h-4" /> History
            </button>
            <button onClick={() => setCurrentView('buy-credits')} className={`focus:outline-none w-full flex items-center gap-3 px-4 py-2 rounded-xl text-[13px] font-semibold transition-all duration-200 ${currentView === 'buy-credits' ? 'bg-white/10 text-white shadow-sm' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}`}>
              <Zap className="w-4 h-4" /> Buy Credits
            </button>
          </div>
        </div>

        {/* Upgrade Card */}
        <div className="p-4 mt-auto">
          <div className="bg-gradient-to-br from-indigo-900/40 to-purple-900/40 border border-white/5 rounded-2xl p-5 text-white relative overflow-hidden group shadow-lg">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 blur-2xl rounded-full translate-x-10 -translate-y-10 group-hover:bg-indigo-500/30 transition-colors duration-500"></div>
            <h4 className="font-bold text-[13px] mb-1 relative z-10 tracking-tight">Upgrade to Pro</h4>
            <p className="text-[11px] text-indigo-200/70 mb-4 leading-relaxed relative z-10">Unlock unlimited generations and premium features.</p>
            <button onClick={() => setCurrentView('pricing')} className="focus:outline-none w-full bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold py-2.5 rounded-lg transition-all duration-200 relative z-10 shadow-sm hover:shadow-md hover:-translate-y-[1px]">
              View Plans
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative z-10">
        
        {/* TOP HEADER */}
        <header className="h-16 bg-[#0B0F19]/80 backdrop-blur-2xl border-b border-white/5 shrink-0 z-30 sticky top-0 w-full">
          <div className="max-w-[1400px] mx-auto w-full h-full px-5 md:px-6 flex items-center justify-between">
            <div className="flex items-center lg:hidden">
              <div className="bg-gradient-to-br from-purple-600 via-pink-500 to-orange-500 p-1.5 rounded-lg shadow-md mr-3 border border-white/10">
                <span className="text-white font-black italic flex items-center justify-center w-3.5 h-3.5 text-sm">F</span>
              </div>
              <h1 className="font-bold text-[15px] text-white tracking-tight">Fusion AI</h1>
            </div>

            <div className="hidden lg:block relative w-80 group">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-orange-600 transition-colors" />
              <input type="text" placeholder="Search your content..." className="w-full bg-[#131826] border border-white/5 rounded-full py-2 pl-10 pr-4 text-[13px] focus:outline-none focus:border-orange-500 focus:bg-[#1A2235] shadow-sm text-white placeholder-slate-500 transition-all duration-200" />
            </div>

            <div className="flex items-center gap-3 md:gap-4">
              {user ? (
                <>
                  {/* Credit Balance Indicator */}
                  <div className="hidden sm:flex items-center gap-2 bg-[#131826] border border-white/5 pl-3 pr-1.5 py-1 rounded-full shadow-sm">
                    <Zap className={`w-3 h-3 ${credits >= 5 ? 'text-amber-500' : 'text-rose-500'}`} />
                    <span className="text-[13px] font-bold text-white">{credits}</span>
                    <span className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider pr-1">Credits</span>
                    <button onClick={() => setCurrentView('buy-credits')} className="focus:outline-none bg-orange-600/10 hover:bg-orange-600/20 text-orange-500 border border-orange-600/20 text-[10px] font-bold px-2.5 py-1 rounded-full transition-all duration-200 shadow-sm">
                      + Add
                    </button>
                  </div>

                  <button className="focus:outline-none w-8 h-8 bg-[#131826] border border-white/5 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 shadow-sm transition-all duration-200 relative">
                    <Bell className="w-3.5 h-3.5"/>
                    <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-rose-500 border border-[#0B0F19] rounded-full"></span>
                  </button>
                  <div onClick={handleOpenEditProfile} className="flex items-center gap-2.5 ml-1 cursor-pointer hover:bg-white/5 p-1 pr-3 rounded-full transition-all duration-200 border border-transparent hover:border-white/5">
                    <img src={user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=fallback`} className="w-7 h-7 rounded-full bg-[#131826] border border-white/10 shadow-sm" alt="Avatar" />
                    <span className="text-[13px] font-semibold text-slate-300 hidden sm:block">{user?.name || 'Creator'}</span>
                  </div>
                </>
              ) : (
                <button onClick={() => setShowAuth(true)} className="focus:outline-none bg-white/10 hover:bg-white/20 border border-white/10 text-white px-5 py-2 rounded-lg text-[13px] font-bold transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-[1px]">
                  Sign In
                </button>
              )}
            </div>
          </div>
        </header>

        {/* DYNAMIC VIEW CONTAINER */}
        <main className="flex-1 overflow-y-auto relative pb-24 lg:pb-0 scroll-smooth">
          {currentView === 'dashboard' && renderDashboard()}
          {currentView === 'create' && renderCreate()}
          {currentView === 'pricing' && renderPricing()}
          {currentView === 'saved' && renderSavedContent()}
          {currentView === 'buy-credits' && renderBuyCredits()}
        </main>

        {/* MOBILE BOTTOM NAV */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-[#0B0F19]/95 backdrop-blur-2xl border-t border-white/5 z-40 flex items-center justify-around p-2 pb-safe shadow-[0_-10px_40px_rgba(0,0,0,0.3)]">
          <button onClick={() => setCurrentView('dashboard')} className={`focus:outline-none flex flex-col items-center gap-1 p-2 rounded-xl transition-all duration-300 ${currentView === 'dashboard' ? 'text-white scale-105' : 'text-slate-500 hover:text-slate-300'}`}>
            <Home className="w-5 h-5" /><span className="text-[10px] font-bold">Home</span>
          </button>
          <button onClick={() => setCurrentView('create')} className={`focus:outline-none flex flex-col items-center gap-1 p-2 rounded-xl transition-all duration-300 ${currentView === 'create' ? 'text-white scale-105' : 'text-slate-500 hover:text-slate-300'}`}>
            <Wand2 className="w-5 h-5" /><span className="text-[10px] font-bold">Create</span>
          </button>
          <button onClick={() => { if (!user) setShowAuth(true); else setCurrentView('saved'); }} className={`focus:outline-none flex flex-col items-center gap-1 p-2 rounded-xl transition-all duration-300 ${currentView === 'saved' ? 'text-white scale-105' : 'text-slate-500 hover:text-slate-300'}`}>
            <Bookmark className="w-5 h-5" /><span className="text-[10px] font-bold">Library</span>
          </button>
          <button onClick={() => setCurrentView('pricing')} className={`focus:outline-none flex flex-col items-center gap-1 p-2 rounded-xl transition-all duration-300 ${currentView === 'pricing' ? 'text-white scale-105' : 'text-slate-500 hover:text-slate-300'}`}>
            <CreditCard className="w-5 h-5" /><span className="text-[10px] font-bold">Pricing</span>
          </button>
          <button onClick={() => { if (!user) setShowAuth(true); else handleOpenEditProfile(); }} className={`focus:outline-none flex flex-col items-center gap-1 p-2 rounded-xl transition-all duration-300 text-slate-500 hover:text-slate-300`}>
            <User className="w-5 h-5" /><span className="text-[10px] font-bold">Profile</span>
          </button>
        </nav>

      </div>

      {/* AUTHENTICATION MODAL */}
      {showAuth && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 selection:bg-orange-600/40 font-sans bg-black/80 backdrop-blur-sm animate-in fade-in duration-300 ease-out">
          <button onClick={() => setShowAuth(false)} className="focus:outline-none absolute top-6 right-6 text-slate-400 hover:text-white transition-colors bg-white/5 p-2 rounded-full hover:bg-white/10 shadow-sm z-50">
            <X className="w-5 h-5" />
          </button>
          
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-orange-600/10 rounded-full blur-[100px] pointer-events-none"></div>
          
          <div className="w-full max-w-md bg-[#131826] border border-white/5 rounded-[28px] p-8 shadow-[0_20px_60px_rgba(0,0,0,0.8)] relative z-10 animate-in zoom-in-95 duration-300 ease-out">
            <div className="flex flex-col items-center justify-center mb-6">
              <div className="bg-gradient-to-br from-purple-600 via-pink-500 to-orange-500 p-3.5 rounded-2xl shadow-lg shadow-pink-500/30 mb-4 border border-white/10">
                <span className="text-white font-black italic flex items-center justify-center w-5 h-5 text-xl">F</span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-white">Fusion AI</h1>
              <p className="text-slate-400 text-[13px] mt-1 text-center">
                {authMode === 'login' ? 'Sign in to access your Workspace' : 'Create an account to get 3 Free Videos (15 Credits)'}
              </p>
            </div>
            
            <form onSubmit={handleAuth} className="space-y-4">
              {authError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-[12px] p-3 rounded-xl mb-2 text-center font-medium">
                  {authError}
                </div>
              )}
              {authMode === 'signup' && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">Full Name</label>
                  <div className="relative group">
                    <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 group-focus-within:text-orange-600 transition-colors" />
                    <input type="text" required value={authName} onChange={(e) => setAuthName(e.target.value)} placeholder="John Doe" className="w-full bg-[#0B0F19] border border-white/10 rounded-xl py-3 pl-10 pr-4 text-[13px] text-white placeholder-slate-500 focus:bg-[#1A2235] focus:outline-none focus:border-orange-500 transition-all shadow-sm" />
                  </div>
                </div>
              )}
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">Email Address</label>
                <div className="relative group">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 group-focus-within:text-orange-600 transition-colors" />
                  <input type="text" required value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} placeholder="you@example.com" className="w-full bg-[#0B0F19] border border-white/10 rounded-xl py-3 pl-10 pr-4 text-[13px] text-white placeholder-slate-500 focus:bg-[#1A2235] focus:outline-none focus:border-orange-500 transition-all shadow-sm" />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">Password</label>
                <div className="relative group">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 group-focus-within:text-orange-600 transition-colors" />
                  <input type="password" required value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} placeholder="••••••••" className="w-full bg-[#0B0F19] border border-white/10 rounded-xl py-3 pl-10 pr-4 text-[13px] text-white placeholder-slate-500 focus:bg-[#1A2235] focus:outline-none focus:border-orange-500 transition-all shadow-sm" />
                </div>
              </div>
              <button type="submit" className="focus:outline-none w-full bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white text-[13px] font-bold py-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-orange-600/30 hover:shadow-orange-600/50 mt-5 hover:-translate-y-[1px] active:translate-y-0">
                {authMode === 'login' ? 'Sign In' : 'Sign Up'} <ArrowRight className="w-4 h-4" />
              </button>
            </form>
            <div className="mt-6 text-center text-[13px] text-slate-400">
              {authMode === 'login' ? "Don't have an account? " : "Already have an account? "}
              <button onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')} className="focus:outline-none text-orange-600 hover:text-orange-500 font-bold transition-colors">
                {authMode === 'login' ? 'Sign up' : 'Sign in'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profile/Settings Modal */}
      {isEditingProfile && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300 ease-out">
          <div className="bg-[#131826] border border-white/5 rounded-[28px] w-full max-w-sm shadow-[0_20px_60px_rgba(0,0,0,0.5)] overflow-hidden animate-in zoom-in-95 duration-300 ease-out">
            <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center bg-[#0B0F19]/50">
              <h3 className="text-[15px] font-bold text-white flex items-center gap-2 tracking-tight">
                <Settings className="w-4 h-4 text-orange-600" /> Account Settings
              </h3>
              <button onClick={() => setIsEditingProfile(false)} className="focus:outline-none text-slate-400 hover:text-white transition-colors bg-white/5 border border-white/10 hover:bg-white/10 p-1.5 rounded-full shadow-sm"><X className="w-3.5 h-3.5" /></button>
            </div>
            <form onSubmit={handleSaveProfile} className="p-6 space-y-4 pb-5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">Full Name</label>
                <div className="relative group">
                  <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 group-focus-within:text-orange-600 transition-colors" />
                  <input type="text" required value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full bg-[#0B0F19] border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-[13px] text-white focus:bg-[#1A2235] focus:outline-none focus:border-orange-500 transition-all shadow-sm" />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">Email Address</label>
                <div className="relative group">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 group-focus-within:text-orange-600 transition-colors" />
                  <input type="email" required value={editEmail} onChange={(e) => setEditEmail(e.target.value)} className="w-full bg-[#0B0F19] border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-[13px] text-white focus:bg-[#1A2235] focus:outline-none focus:border-orange-500 transition-all shadow-sm" />
                </div>
              </div>
              <div className="pt-3">
                <button type="submit" className="focus:outline-none w-full bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white text-[13px] font-bold py-3 rounded-xl transition-all duration-200 shadow-lg shadow-orange-600/30 hover:shadow-orange-600/50 hover:-translate-y-[1px]">Save Changes</button>
              </div>
            </form>
            <div className="px-6 pb-6 pt-4 border-t border-white/5 bg-[#0B0F19]/50 space-y-3">
              <button type="button" onClick={() => { setIsEditingProfile(false); setCurrentView('pricing'); }} className="focus:outline-none w-full flex items-center justify-between p-3.5 bg-[#131826] border border-white/10 rounded-xl hover:border-orange-600/30 hover:bg-orange-600/10 transition-all duration-200 group shadow-sm">
                <div className="flex items-center gap-2.5"><Zap className="w-4 h-4 text-orange-600" /><span className="text-[13px] font-bold text-slate-300 group-hover:text-orange-500 transition-colors">
                  {plan === 'none' ? 'Upgrade Plan' : 'Manage Billing'}
                </span></div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-orange-500 transition-colors" />
              </button>
              <button type="button" onClick={handleLogout} className="focus:outline-none w-full flex items-center justify-between p-3.5 bg-[#131826] border border-white/10 rounded-xl hover:border-red-500/30 hover:bg-red-500/10 transition-all duration-200 group shadow-sm">
                <div className="flex items-center gap-2.5"><LogOut className="w-4 h-4 text-red-500" /><span className="text-[13px] font-bold text-red-400">Log Out</span></div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EXPORT & SHARE MODAL */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 selection:bg-orange-600/40 font-sans bg-black/80 backdrop-blur-sm animate-in fade-in duration-300 ease-out">
          <button onClick={() => setShowExportModal(false)} disabled={exportProgress > 0} className="focus:outline-none absolute top-6 right-6 text-slate-400 hover:text-white transition-colors bg-white/5 p-2 rounded-full hover:bg-white/10 shadow-sm z-50 disabled:opacity-50">
            <X className="w-5 h-5" />
          </button>
          
          <div className="w-full max-w-[420px] bg-[#131826] border border-white/5 rounded-[28px] p-7 shadow-[0_20px_60px_rgba(0,0,0,0.5)] relative z-10 animate-in zoom-in-95 duration-300 ease-out">
            <div className="flex items-center gap-3.5 mb-6">
              <div className="bg-orange-600/10 p-2.5 rounded-xl border border-orange-600/20 shadow-sm">
                <Share2 className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <h2 className="text-[17px] font-bold text-white tracking-tight">Export & Share</h2>
                <p className="text-[12px] text-slate-400 mt-0.5">Render your masterpiece and publish directly.</p>
              </div>
            </div>

            {exportProgress > 0 ? (
              <div className="py-8 text-center space-y-4">
                <Loader2 className="w-10 h-10 text-orange-600 animate-spin mx-auto" />
                <h3 className="text-lg font-bold text-white tracking-tight">{exportStatus}</h3>
                <div className="w-full bg-[#0B0F19] rounded-full h-2 overflow-hidden border border-white/10 shadow-inner">
                  <div className="bg-gradient-to-r from-orange-600 to-amber-600 h-full rounded-full transition-all duration-300 ease-out" style={{ width: `${exportProgress}%` }}></div>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1.5 flex items-center gap-1">Format</label>
                    <select value={exportFormat} onChange={(e) => setExportFormat(e.target.value)} className="w-full bg-[#0B0F19] hover:bg-[#0B0F19]/80 border border-white/10 rounded-xl py-2.5 px-3 text-[13px] text-white focus:outline-none focus:border-orange-600 focus:ring-2 focus:ring-orange-600/10 focus:bg-[#1A2235] transition-all cursor-pointer shadow-sm">
                      <option value="mp4">MP4</option>
                      <option value="mov">MOV</option>
                      <option value="webm">WebM</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1.5 flex items-center gap-1">Quality</label>
                    <select value={exportQuality} onChange={(e) => setExportQuality(e.target.value)} className="w-full bg-[#0B0F19] hover:bg-[#0B0F19]/80 border border-white/10 rounded-xl py-2.5 px-3 text-[13px] text-white focus:outline-none focus:border-orange-600 focus:ring-2 focus:ring-orange-600/10 focus:bg-[#1A2235] transition-all cursor-pointer shadow-sm">
                      <option value="720p">720p</option>
                      <option value="1080p">1080p</option>
                      <option value="4k" disabled={plan !== 'pro'}>4K</option>
                    </select>
                  </div>
                </div>

                <div className="pt-2">
                  <button onClick={() => handleExport('Local Storage')} className="focus:outline-none w-full bg-white hover:bg-slate-200 text-[#0B0F19] font-bold py-3.5 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-[0_4px_14px_0_rgb(255,255,255,0.1)] hover:shadow-[0_6px_20px_rgba(255,255,255,0.2)] hover:-translate-y-[1px] text-[13px]">
                    <HardDrive className="w-4 h-4" /> Save to Device
                  </button>
                </div>

                <div className="relative py-3">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10"></div></div>
                  <div className="relative flex justify-center"><span className="bg-[#131826] px-3 text-[10px] text-slate-500 font-bold uppercase tracking-wider">Or publish directly to</span></div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => handleExport('YouTube Shorts')} className="focus:outline-none bg-[#ff0000]/10 hover:bg-[#ff0000]/20 text-[#ff0000] border border-[#ff0000]/30 font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm text-[13px] hover:-translate-y-[1px]">
                    <Video className="w-4 h-4" /> Shorts
                  </button>
                  <button onClick={() => handleExport('TikTok')} className="focus:outline-none bg-white/5 hover:bg-white/10 text-white border border-white/10 font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm text-[13px] hover:-translate-y-[1px]">
                    <Music className="w-4 h-4" /> TikTok
                  </button>
                  <button onClick={() => handleExport('Instagram Reels')} className="focus:outline-none bg-gradient-to-tr from-fuchsia-500/10 to-yellow-500/10 hover:from-fuchsia-500/20 hover:to-yellow-500/20 text-fuchsia-400 border border-fuchsia-500/30 font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm text-[13px] hover:-translate-y-[1px]">
                    <Camera className="w-4 h-4" /> Reels
                  </button>
                  <button onClick={() => handleExport('Facebook')} className="focus:outline-none bg-[#1877F2]/10 hover:bg-[#1877F2]/20 text-[#1877F2] border border-[#1877F2]/30 font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm text-[13px] hover:-translate-y-[1px]">
                    <Users className="w-4 h-4" /> Facebook
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        /* Hide scrollbar for sidebar */
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        *, *:focus { outline: none !important; -webkit-tap-highlight-color: transparent; }
      `}} />
    </div>
  );
}