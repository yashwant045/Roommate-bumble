"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Shield, 
  Sparkles, 
  MessageSquare, 
  UserCheck, 
  Home, 
  Cpu, 
  CheckCircle,
  Activity,
  Layers,
  Heart,
  X,
  Send,
  User,
  Settings,
  Plus,
  MapPin,
  Briefcase,
  BookOpen,
  IndianRupee,
  Coffee,
  Check,
  LogOut,
  ChevronRight,
  ChevronLeft,
  Info
} from "lucide-react";
import { io, Socket } from "socket.io-client";
import { useAuthStore } from "../store/useAuthStore";
import api from "../utils/api";

const ACADEMIC_COURSES = [
  "B.Tech / BE (Computer Science)",
  "B.Tech / BE (Information Technology)",
  "B.Tech / BE (ECE)",
  "B.Tech / BE (Electrical)",
  "B.Tech / BE (Mechanical)",
  "B.Tech / BE (Civil)",
  "MBA (Finance / Marketing)",
  "BBA",
  "MCA",
  "BCA",
  "B.Sc",
  "M.Sc",
  "B.Com",
  "M.Com",
  "BA",
  "MA",
  "MBBS",
  "B.Pharm",
  "B.Arch"
];

export default function HomePage() {
  const { 
    user, 
    profile, 
    preferences, 
    accessToken, 
    loadFromStorage, 
    setAuth, 
    setProfile, 
    setPreferences, 
    logout 
  } = useAuthStore();

  // Navigation & General Tabs
  const [activeTab, setActiveTab] = useState<"swipe" | "chat" | "listings" | "profile" | "requests">("swipe");
  const [isStoreLoaded, setIsStoreLoaded] = useState(false);

  // Authentication State
  const [authTab, setAuthTab] = useState<"login" | "register">("login");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authSuccess, setAuthSuccess] = useState("");
  const [authSubmitting, setAuthSubmitting] = useState(false);

  // Setup Wizard State
  const [wizardStep, setWizardStep] = useState(1);
  const [wizardSubmitting, setWizardSubmitting] = useState(false);
  const [wizardError, setWizardError] = useState("");

  // Profile Wizard Form Fields
  const [name, setName] = useState("");
  const [gender, setGender] = useState(0); // 0=Male, 1=Female
  const [currentCity, setCurrentCity] = useState("");
  const [hometown, setHometown] = useState("");
  const [course, setCourse] = useState("");
  const [workEx, setWorkEx] = useState(0.0);
  const [bio, setBio] = useState("");
  const [profileImage, setProfileImage] = useState("");

  // Preferences Wizard Form Fields
  const [rentBudget, setRentBudget] = useState(15000);
  const [distFromUni, setDistFromUni] = useState(5.0);
  const [maxPpr, setMaxPpr] = useState(2);
  const [alcohol, setAlcohol] = useState(0); // 0=Flexible, 1=No, 2=Yes
  const [smoking, setSmoking] = useState(0); // 0=Flexible, 1=No, 2=Yes
  const [foodPref, setFoodPref] = useState(0); // 0=Flexible, 1=Veg, 2=Non Veg
  const [culSkills, setCulSkills] = useState(0); // 0=Sometimes, 1=Expert, 2=Never
  const [bhk1, setBhk1] = useState(0);
  const [bhk2, setBhk2] = useState(0);
  const [bhk3, setBhk3] = useState(0);
  const [bhk4, setBhk4] = useState(0);
  const [hall, setHall] = useState(0);
  const [openToOtherBranch, setOpenToOtherBranch] = useState(0);

  // Recommendations & Swipe System State
  const [candidates, setCandidates] = useState<any[]>([]);
  const [swipeIndex, setSwipeIndex] = useState(0);
  const [candidatesLoading, setCandidatesLoading] = useState(false);
  const [swipeSubmitting, setSwipeSubmitting] = useState(false);
  const [lastMatch, setLastMatch] = useState<any | null>(null);
  const [isRecalculating, setIsRecalculating] = useState(false);

  // Matches & Chat State
  const [matches, setMatches] = useState<any[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [requests, setRequests] = useState<any[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  
  // Listings State
  const [listings, setListings] = useState<any[]>([]);
  const [listingsLoading, setListingsLoading] = useState(false);
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [listTitle, setListTitle] = useState("");
  const [listDesc, setListDesc] = useState("");
  const [listRent, setListRent] = useState(15000);
  const [listAddress, setListAddress] = useState("");
  const [listAmenities, setListAmenities] = useState("");
  const [listSubmitting, setListSubmitting] = useState(false);

  // Asset Upload States
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isUploadingListing, setIsUploadingListing] = useState(false);
  const [uploadedListingImages, setUploadedListingImages] = useState<string[]>([]);

  // Refs & Sockets
  const socketRef = useRef<Socket | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // 1. Initialise Zustand Hydration
  useEffect(() => {
    loadFromStorage();
    setIsStoreLoaded(true);

    // Global listener for automatic logouts triggered by silent refresh expiry
    const handleGlobalLogout = () => {
      setSelectedMatch(null);
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
    window.addEventListener("auth-logout", handleGlobalLogout);
    return () => window.removeEventListener("auth-logout", handleGlobalLogout);
  }, []);

  // 2. Fetch data based on active tab & auth state
  useEffect(() => {
    if (!user || !profile) return;

    if (activeTab === "swipe") {
      fetchRecommendations();
    } else if (activeTab === "chat") {
      fetchMatches();
    } else if (activeTab === "listings") {
      fetchListings();
    } else if (activeTab === "requests") {
      fetchRequests();
    }
  }, [activeTab, user, profile]);

  // 3. Socket.IO Real-time chat connection handler
  useEffect(() => {
    if (!user || !accessToken) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    // Connect to Node WebSocket
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000";
    const socket = io(socketUrl, {
      auth: { token: accessToken },
      transports: ["websocket"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("Socket connected:", socket.id);
    });

    socket.on("receive_message", (message: any) => {
      // Append message if it belongs to currently active conversation
      if (selectedMatch && message.matchId === selectedMatch.matchId) {
        setMessages((prev) => [...prev, message]);
      }
      // Proactively refresh matches list to show last active text or highlight active chat
      fetchMatches();
    });

    socket.on("error_event", (err: any) => {
      console.error("Socket error event:", err.message);
    });

    socket.on("disconnect", () => {
      console.log("Socket disconnected");
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user, accessToken, selectedMatch]);

  // 4. Auto-scroll chat body
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load wizard inputs with existing profile values
  useEffect(() => {
    if (profile) {
      setName(profile.name || "");
      setGender(profile.gender !== undefined ? profile.gender : 0);
      setCurrentCity(profile.currentCity || "");
      setHometown(profile.hometown || "");
      setCourse(profile.course || "");
      setWorkEx(profile.workEx !== undefined ? profile.workEx : 0.0);
      setBio(profile.bio || "");
      setProfileImage(profile.profileImage || "");
    }
    if (preferences) {
      setRentBudget(preferences.rentBudget || 500);
      setDistFromUni(preferences.distFromUni || 5.0);
      setMaxPpr(preferences.maxPpr || 2);
      setAlcohol(preferences.alcohol !== undefined ? preferences.alcohol : 0);
      setSmoking(preferences.smoking !== undefined ? preferences.smoking : 0);
      setFoodPref(preferences.foodPref !== undefined ? preferences.foodPref : 0);
      setCulSkills(preferences.culSkills !== undefined ? preferences.culSkills : 0);
      setBhk1(preferences.bhk1 || 0);
      setBhk2(preferences.bhk2 || 0);
      setBhk3(preferences.bhk3 || 0);
      setBhk4(preferences.bhk4 || 0);
      setHall(preferences.hall || 0);
      setOpenToOtherBranch(preferences.openToOtherBranch || 0);
    }
  }, [profile, preferences]);

  // ----------------------------------------------------
  // Network Request Routines (Axios API Client)
  // ----------------------------------------------------

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthSuccess("");
    if (!loginEmail || !loginPassword) {
      setAuthError("Please fill out all fields");
      return;
    }
    setAuthSubmitting(true);
    try {
      const res = await api.post("/auth/login", { email: loginEmail, password: loginPassword });
      if (res.data.success) {
        const { accessToken, refreshToken, userId, email } = res.data.data;
        const userObj = { id: userId, email };
        
        // Save authentication first to update headers for future requests
        setAuth(accessToken, refreshToken, userObj);

        // Fetch user's profile and preferences to decide where to transition
        try {
          const profileRes = await api.get("/profile/me");
          if (profileRes.data.success && profileRes.data.data) {
            const { preferences, ...profileData } = profileRes.data.data;
            setProfile(profileData);
            setPreferences(preferences);
          } else {
            setProfile(null);
            setPreferences(null);
          }
        } catch (profileErr) {
          // Profile is not initialized yet, will trigger the wizard
          setProfile(null);
          setPreferences(null);
        }

        setAuthSuccess("Login successful!");
      }
    } catch (err: any) {
      setAuthError(err.response?.data?.message || "Login failed. Please check credentials.");
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthSuccess("");
    if (!registerEmail || !registerPassword || !registerConfirmPassword) {
      setAuthError("All fields are required");
      return;
    }
    if (registerPassword !== registerConfirmPassword) {
      setAuthError("Passwords do not match");
      return;
    }
    setAuthSubmitting(true);
    try {
      const res = await api.post("/auth/register", { email: registerEmail, password: registerPassword });
      if (res.data.success) {
        const { accessToken, refreshToken, userId, email } = res.data.data;
        const userObj = { id: userId, email };
        
        // Save authentication credentials
        setAuth(accessToken, refreshToken, userObj);
        setProfile(null);
        setPreferences(null);
        setAuthSuccess("Account registered! Let's fill out your profile.");
      }
    } catch (err: any) {
      setAuthError(err.response?.data?.message || "Registration failed");
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleWizardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setWizardError("");
    setWizardSubmitting(true);
    try {
      const payload = {
        name,
        gender: Number(gender),
        currentCity,
        hometown,
        course,
        workEx: Number(workEx),
        bio,
        profileImage: profileImage || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name || "roommate")}`,
        
        rentBudget: Number(rentBudget),
        distFromUni: Number(distFromUni),
        maxPpr: Number(maxPpr),
        alcohol: Number(alcohol),
        smoking: Number(smoking),
        foodPref: Number(foodPref),
        culSkills: Number(culSkills),
        bhk1: Number(bhk1),
        bhk2: Number(bhk2),
        bhk3: Number(bhk3),
        bhk4: Number(bhk4),
        hall: Number(hall),
        openToOtherBranch: Number(openToOtherBranch),
      };

      const res = await api.put("/profile/me", payload);
      if (res.data.success) {
        const { preferences, ...profileData } = res.data.data;
        setProfile(profileData);
        setPreferences(preferences);
        setActiveTab("swipe");
      }
    } catch (err: any) {
      setWizardError(err.response?.data?.error || err.response?.data?.message || "Failed to update profile wizard.");
    } finally {
      setWizardSubmitting(false);
    }
  };

  const fetchRecommendations = async (silent = false) => {
    if (!silent) setCandidatesLoading(true);
    try {
      const res = await api.get("/recommendations");
      if (res.data.success) {
        setCandidates(res.data.data);
        setSwipeIndex(0);
      }
    } catch (err) {
      console.error("Failed to load recommendations", err);
    } finally {
      if (!silent) setCandidatesLoading(false);
    }
  };

  const handleSilentPreferenceUpdate = async () => {
    if (!profile) return;
    setIsRecalculating(true);
    try {
      const payload = {
        name,
        gender: Number(gender),
        currentCity,
        hometown,
        course,
        workEx: Number(workEx),
        bio,
        profileImage: profileImage || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name || "roommate")}`,
        rentBudget: Number(rentBudget),
        distFromUni: Number(distFromUni),
        maxPpr: Number(maxPpr),
        alcohol: Number(alcohol),
        smoking: Number(smoking),
        foodPref: Number(foodPref),
        culSkills: Number(culSkills),
        bhk1: Number(bhk1),
        bhk2: Number(bhk2),
        bhk3: Number(bhk3),
        bhk4: Number(bhk4),
        hall: Number(hall),
        openToOtherBranch: Number(openToOtherBranch),
      };

      const res = await api.put("/profile/me", payload);
      if (res.data.success) {
        const { preferences, ...profileData } = res.data.data;
        setProfile(profileData);
        setPreferences(preferences);
        await fetchRecommendations(true);
      }
    } catch (err) {
      console.error("Silent preference update failed", err);
    } finally {
      setIsRecalculating(false);
    }
  };

  // Debounced auto-save & refetch for "Tweak Your Vibe"
  useEffect(() => {
    if (!user || !profile || activeTab !== "swipe") return;

    const timer = setTimeout(() => {
      if (
        preferences && 
        (rentBudget !== preferences.rentBudget || distFromUni !== preferences.distFromUni)
      ) {
        handleSilentPreferenceUpdate();
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [rentBudget, distFromUni, activeTab, user, profile, preferences]);

  const recordSwipe = async (swipeeId: string, liked: boolean) => {
    if (swipeSubmitting) return;
    setSwipeSubmitting(true);
    try {
      const res = await api.post("/swipes", { swipeeId, liked });
      if (res.data.success) {
        const { matchCreated, matchId } = res.data.data;
        if (matchCreated) {
          // Open Match Celebration modal
          const matchedCandidate = candidates[swipeIndex];
          setLastMatch({
            matchId,
            user: matchedCandidate,
          });
        }
        // Slide to next card
        setSwipeIndex((prev) => prev + 1);
      }
    } catch (err) {
      console.error("Swipe operation failed", err);
    } finally {
      setSwipeSubmitting(false);
    }
  };

  const fetchMatches = async () => {
    setMatchesLoading(true);
    try {
      const res = await api.get("/swipes/matches");
      if (res.data.success) {
        setMatches(res.data.data);
      }
    } catch (err) {
      console.error("Failed to fetch matches", err);
    } finally {
      setMatchesLoading(false);
    }
  };

  const fetchRequests = async () => {
    setRequestsLoading(true);
    try {
      const res = await api.get("/swipes/requests");
      if (res.data.success) {
        setRequests(res.data.data);
      }
    } catch (err) {
      console.error("Failed to fetch requests", err);
    } finally {
      setRequestsLoading(false);
    }
  };

  const selectConversation = async (match: any) => {
    setSelectedMatch(match);
    setMessagesLoading(true);
    try {
      // Connect WS room
      if (socketRef.current) {
        socketRef.current.emit("join_room", { matchId: match.matchId });
      }

      // Fetch match history from REST DB API
      const res = await api.get(`/messages/${match.matchId}`);
      if (res.data.success) {
        setMessages(res.data.data);
      }
    } catch (err) {
      console.error("Failed to fetch conversation history", err);
    } finally {
      setMessagesLoading(false);
    }
  };

  const sendChatMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedMatch || !socketRef.current) return;

    socketRef.current.emit("send_message", {
      matchId: selectedMatch.matchId,
      content: newMessage.trim(),
    });

    setNewMessage("");
  };

  const fetchListings = async () => {
    setListingsLoading(true);
    try {
      const res = await api.get("/listings");
      if (res.data.success) {
        setListings(res.data.data);
      }
    } catch (err) {
      console.error("Failed to load listings", err);
    } finally {
      setListingsLoading(false);
    }
  };

  const handlePostListing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!listTitle || !listDesc || !listRent || !listAddress) return;
    setListSubmitting(true);
    try {
      const amenitiesArr = listAmenities
        .split(",")
        .map((x) => x.trim())
        .filter((x) => x.length > 0);

      const finalImages = uploadedListingImages.length > 0
        ? uploadedListingImages
        : [
            "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=600&q=80",
            "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=600&q=80"
          ];

      const res = await api.post("/listings", {
        title: listTitle,
        description: listDesc,
        rent: Number(listRent),
        address: listAddress,
        images: finalImages,
        amenities: amenitiesArr,
      });

      if (res.data.success) {
        setListTitle("");
        setListDesc("");
        setListRent(600);
        setListAddress("");
        setListAmenities("");
        setUploadedListingImages([]);
        setIsPostModalOpen(false);
        fetchListings();
      }
    } catch (err) {
      console.error("Listing submission failed", err);
    } finally {
      setListSubmitting(false);
    }
  };

  const handleDeleteListing = async (listingId: string) => {
    if (!confirm("Are you sure you want to delete this property listing?")) return;
    try {
      await api.delete(`/listings/${listingId}`);
      fetchListings();
    } catch (err) {
      console.error("Deletion failed", err);
    }
  };

  const handleAuthLogout = () => {
    setSelectedMatch(null);
    logout();
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingAvatar(true);
    setWizardError("");

    const formData = new FormData();
    formData.append("image", file);

    try {
      const res = await api.post("/uploads/image", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      if (res.data.success) {
        setProfileImage(res.data.data.url);
      }
    } catch (err: any) {
      console.error("Avatar upload failed:", err);
      setWizardError(err.response?.data?.message || "Failed to upload profile image");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleListingImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingListing(true);
    const formData = new FormData();
    formData.append("image", file);

    try {
      const res = await api.post("/uploads/image", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      if (res.data.success) {
        setUploadedListingImages((prev) => [...prev, res.data.data.url]);
      }
    } catch (err: any) {
      console.error("Listing photo upload failed:", err);
      alert(err.response?.data?.message || "Failed to upload property image");
    } finally {
      setIsUploadingListing(false);
    }
  };

  // ----------------------------------------------------
  // Dynamic Views Assembly
  // ----------------------------------------------------

  // View A: Global Loading Handshake
  if (!isStoreLoaded) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-100 gap-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary-500 to-amber-400 flex items-center justify-center font-bold text-slate-950 shadow-md text-xl animate-pulse">
          B
        </div>
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 animate-pulse">
          Securing Handshake...
        </p>
      </div>
    );
  }

  // View B: Auth Login/Register View
  if (!user) {
    return (
      <main className="relative min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between overflow-hidden">
        {/* Glowing Orbs */}
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-primary-500/10 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-amber-500/5 blur-[120px] pointer-events-none" />

        {/* Global Navigation Header */}
        <header className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary-500 to-amber-400 flex items-center justify-center font-bold text-slate-950 shadow-md shadow-primary-500/20 text-lg">
              B
            </div>
            <span className="font-extrabold text-xl tracking-wider">
              ROOMMATE<span className="text-primary-400">BUMBLE</span>
            </span>
          </div>
          <div className="flex items-center gap-2 bg-slate-900/60 px-3 py-1.5 rounded-full border border-slate-800/80 text-xs font-medium text-slate-400">
            <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>ML Server Online</span>
          </div>
        </header>

        {/* Authentication Card Wrapper */}
        <section className="relative z-10 w-full max-w-md mx-auto px-6 py-12">
          <div className="glass-panel rounded-3xl p-8 shadow-glass shadow-black/50 border border-slate-800/80">
            {/* Header Tabs */}
            <div className="flex rounded-2xl bg-slate-900/80 p-1 mb-8 border border-slate-800/60">
              <button 
                onClick={() => { setAuthTab("login"); setAuthError(""); }}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${authTab === "login" ? "bg-primary-500 text-slate-950 shadow-md" : "text-slate-400 hover:text-slate-200"}`}
              >
                Sign In
              </button>
              <button 
                onClick={() => { setAuthTab("register"); setAuthError(""); }}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${authTab === "register" ? "bg-primary-500 text-slate-950 shadow-md" : "text-slate-400 hover:text-slate-200"}`}
              >
                Sign Up
              </button>
            </div>

            {/* Error notifications */}
            {authError && (
              <div className="mb-6 p-4 rounded-xl bg-red-950/40 border border-red-800/40 text-red-300 text-xs font-medium">
                {authError}
              </div>
            )}
            {authSuccess && (
              <div className="mb-6 p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/40 text-emerald-300 text-xs font-medium">
                {authSuccess}
              </div>
            )}

            {/* Forms Panel */}
            {authTab === "login" ? (
              <form onSubmit={handleLogin} className="flex flex-col gap-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Email Address</label>
                  <input 
                    type="email" 
                    value={loginEmail} 
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="name@university.edu" 
                    className="w-full bg-slate-950/60 rounded-xl px-4 py-3 border border-slate-800 focus:border-primary-500 outline-none text-slate-100 text-sm transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Password</label>
                  <input 
                    type="password" 
                    value={loginPassword} 
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••" 
                    className="w-full bg-slate-950/60 rounded-xl px-4 py-3 border border-slate-800 focus:border-primary-500 outline-none text-slate-100 text-sm transition-colors"
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={authSubmitting}
                  className="w-full py-3 mt-4 bg-gradient-to-r from-primary-500 to-amber-500 rounded-xl font-bold text-slate-950 shadow-lg shadow-primary-500/20 hover:brightness-110 active:scale-95 transition-all text-sm flex items-center justify-center gap-2"
                >
                  {authSubmitting ? "Authenticating..." : "Access Swiper"}
                  <ChevronRight className="w-4 h-4" />
                </button>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="flex flex-col gap-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">University Email</label>
                  <input 
                    type="email" 
                    value={registerEmail} 
                    onChange={(e) => setRegisterEmail(e.target.value)}
                    placeholder="student@university.edu" 
                    className="w-full bg-slate-950/60 rounded-xl px-4 py-3 border border-slate-800 focus:border-primary-500 outline-none text-slate-100 text-sm transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Password</label>
                  <input 
                    type="password" 
                    value={registerPassword} 
                    onChange={(e) => setRegisterPassword(e.target.value)}
                    placeholder="Minimum 6 characters" 
                    className="w-full bg-slate-950/60 rounded-xl px-4 py-3 border border-slate-800 focus:border-primary-500 outline-none text-slate-100 text-sm transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Confirm Password</label>
                  <input 
                    type="password" 
                    value={registerConfirmPassword} 
                    onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                    placeholder="••••••••" 
                    className="w-full bg-slate-950/60 rounded-xl px-4 py-3 border border-slate-800 focus:border-primary-500 outline-none text-slate-100 text-sm transition-colors"
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={authSubmitting}
                  className="w-full py-3 mt-4 bg-gradient-to-r from-primary-500 to-amber-500 rounded-xl font-bold text-slate-950 shadow-lg shadow-primary-500/20 hover:brightness-110 active:scale-95 transition-all text-sm flex items-center justify-center gap-2"
                >
                  {authSubmitting ? "Creating Account..." : "Begin Onboarding"}
                  <ChevronRight className="w-4 h-4" />
                </button>
              </form>
            )}
          </div>
        </section>

        {/* Footer */}
        <footer className="relative z-10 w-full text-center py-6 text-xs text-slate-600 border-t border-slate-900/60">
          © 2026 Roommate Bumble Corporation. Secure Double Token Protection.
        </footer>
      </main>
    );
  }

  // View C: Profile & Preference Setup Wizard (Mandatory if Profile is missing)
  if (user && !profile) {
    return (
      <main className="relative min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between overflow-hidden">
        {/* Orbs */}
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-primary-500/5 blur-[120px] pointer-events-none" />
        
        <header className="relative z-10 w-full max-w-5xl mx-auto px-6 py-6 border-b border-slate-900/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-primary-500 to-amber-400 flex items-center justify-center font-bold text-slate-950 text-base">
              B
            </div>
            <span className="font-extrabold text-lg">ROOMMATE<span className="text-primary-400">BUMBLE</span></span>
          </div>
          <button onClick={handleAuthLogout} className="text-xs text-slate-500 hover:text-red-400 transition-colors flex items-center gap-1.5">
            <LogOut className="w-3.5 h-3.5" /> Sign Out
          </button>
        </header>

        <section className="relative z-10 w-full max-w-2xl mx-auto px-6 py-8">
          <div className="glass-panel rounded-3xl p-8 shadow-glass border border-slate-800/80">
            {/* Step Wizard Navigator */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 uppercase tracking-widest font-semibold">Wizard Step</span>
                <span className="px-2.5 py-1 rounded-full bg-primary-500/10 text-primary-400 border border-primary-500/20 text-xs font-bold">{wizardStep} of 3</span>
              </div>
              <div className="flex gap-1">
                <span className={`w-6 h-1 rounded-full transition-all duration-300 ${wizardStep >= 1 ? "bg-primary-500" : "bg-slate-800"}`} />
                <span className={`w-6 h-1 rounded-full transition-all duration-300 ${wizardStep >= 2 ? "bg-primary-500" : "bg-slate-800"}`} />
                <span className={`w-6 h-1 rounded-full transition-all duration-300 ${wizardStep >= 3 ? "bg-primary-500" : "bg-slate-800"}`} />
              </div>
            </div>

            {wizardError && (
              <div className="mb-6 p-4 rounded-xl bg-red-950/40 border border-red-800/40 text-red-300 text-xs font-medium">
                {wizardError}
              </div>
            )}

            <form onSubmit={handleWizardSubmit}>
              {/* STEP 1: Personal Details */}
              {wizardStep === 1 && (
                <div className="flex flex-col gap-5">
                  <div className="border-b border-slate-900 pb-2">
                    <h3 className="text-lg font-bold text-white">Your Personal Card</h3>
                    <p className="text-xs text-slate-400 mt-1">This forms your continuous and categorical search vectors.</p>
                  </div>
                  
                  {/* Avatar Upload component */}
                  <div className="flex items-center gap-4 bg-slate-900/40 p-4 rounded-2xl border border-slate-850">
                    <div className="relative w-16 h-16 rounded-2xl bg-slate-950 border border-slate-850 flex items-center justify-center overflow-hidden">
                      {profileImage ? (
                        <img src={profileImage} alt="Avatar Preview" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-8 h-8 text-slate-605" />
                      )}
                      {isUploadingAvatar && (
                        <div className="absolute inset-0 bg-slate-950/70 flex items-center justify-center">
                          <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-bold text-white">Profile Photo</span>
                      <span className="text-[10px] text-slate-500">Only JPG, PNG or WEBP. Max 5MB.</span>
                      <label className="inline-flex items-center justify-center px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-white rounded-lg text-[10px] font-bold cursor-pointer transition-colors w-fit border border-slate-700 mt-1">
                        Choose File
                        <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Display Name</label>
                    <input 
                      type="text" 
                      value={name} 
                      onChange={(e) => setName(e.target.value)}
                      placeholder="E.g., Yash Patel" 
                      className="w-full bg-slate-950/60 rounded-xl px-4 py-3 border border-slate-800 focus:border-primary-500 outline-none text-slate-100 text-sm"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Gender Identification</label>
                      <select 
                        value={gender} 
                        onChange={(e) => setGender(Number(e.target.value))}
                        className="w-full bg-slate-950/60 rounded-xl px-4 py-3 border border-slate-800 outline-none text-slate-100 text-sm"
                      >
                        <option value={0}>Male</option>
                        <option value={1}>Female</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Academic Course</label>
                      <select 
                        value={course} 
                        onChange={(e) => setCourse(e.target.value)}
                        className="w-full bg-slate-950/60 rounded-xl px-4 py-3 border border-slate-800 outline-none text-slate-100 text-sm"
                        required
                      >
                        <option value="" disabled>Select your course</option>
                        {ACADEMIC_COURSES.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Current Study City</label>
                      <input 
                        type="text" 
                        value={currentCity} 
                        onChange={(e) => setCurrentCity(e.target.value)}
                        placeholder="E.g., Mumbai, Bangalore" 
                        className="w-full bg-slate-950/60 rounded-xl px-4 py-3 border border-slate-800 focus:border-primary-500 outline-none text-slate-100 text-sm"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Hometown</label>
                      <input 
                        type="text" 
                        value={hometown} 
                        onChange={(e) => setHometown(e.target.value)}
                        placeholder="E.g., Pune, Nagpur" 
                        className="w-full bg-slate-950/60 rounded-xl px-4 py-3 border border-slate-800 focus:border-primary-500 outline-none text-slate-100 text-sm"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-2 flex justify-between">
                      <span>Work Experience (Years)</span>
                      <span className="text-primary-400 font-bold">{workEx} Years</span>
                    </label>
                    <input 
                      type="range" 
                      min="0" 
                      max="10" 
                      step="0.5"
                      value={workEx} 
                      onChange={(e) => setWorkEx(parseFloat(e.target.value))}
                      className="w-full accent-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Short Bio</label>
                    <textarea 
                      value={bio} 
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Tell potential roommates about your daily routines..." 
                      rows={3}
                      className="w-full bg-slate-950/60 rounded-xl px-4 py-3 border border-slate-800 focus:border-primary-500 outline-none text-slate-100 text-sm resize-none"
                    />
                  </div>

                  <div className="flex justify-end mt-4">
                    <button 
                      type="button" 
                      onClick={() => setWizardStep(2)}
                      className="py-3 px-6 bg-slate-800 hover:bg-slate-700 rounded-xl text-white text-sm font-semibold transition-all flex items-center gap-1.5"
                    >
                      Next Step <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: Basic Budget Preferences */}
              {wizardStep === 2 && (
                <div className="flex flex-col gap-5">
                  <div className="border-b border-slate-900 pb-2">
                    <h3 className="text-lg font-bold text-white">Co-Living Parameters</h3>
                    <p className="text-xs text-slate-400 mt-1">Continuous parameters mapped through Euclidean Vector Space.</p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-2 flex justify-between">
                      <span>Rent Budget Threshold</span>
                      <span className="text-primary-400 font-bold">₹{rentBudget} / Month</span>
                    </label>
                    <input 
                      type="range" 
                      min="1000" 
                      max="100000" 
                      step="500"
                      value={rentBudget} 
                      onChange={(e) => setRentBudget(Number(e.target.value))}
                      className="w-full accent-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-2 flex justify-between">
                      <span>Maximum Distance from University</span>
                      <span className="text-primary-400 font-bold">{distFromUni} km</span>
                    </label>
                    <input 
                      type="range" 
                      min="0.5" 
                      max="30" 
                      step="0.5"
                      value={distFromUni} 
                      onChange={(e) => setDistFromUni(parseFloat(e.target.value))}
                      className="w-full accent-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Max People Shared Per Room (Room Sharing)</label>
                    <select 
                      value={maxPpr} 
                      onChange={(e) => setMaxPpr(Number(e.target.value))}
                      className="w-full bg-slate-950/60 rounded-xl px-4 py-3 border border-slate-800 outline-none text-slate-100 text-sm"
                    >
                      <option value={1}>Single Room (1 person)</option>
                      <option value={2}>Shared Double (2 people)</option>
                      <option value={3}>Triple Sharing (3 people)</option>
                      <option value={4}>4+ Shared Room</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between mt-4">
                    <button 
                      type="button" 
                      onClick={() => setWizardStep(1)}
                      className="py-3 px-6 bg-slate-900 border border-slate-800 hover:bg-slate-850 rounded-xl text-slate-400 text-sm font-semibold transition-all flex items-center gap-1.5"
                    >
                      <ChevronLeft className="w-4 h-4" /> Back
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setWizardStep(3)}
                      className="py-3 px-6 bg-slate-800 hover:bg-slate-700 rounded-xl text-white text-sm font-semibold transition-all flex items-center gap-1.5"
                    >
                      Next Step <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: Lifestyle Habits & Apartment Types */}
              {wizardStep === 3 && (
                <div className="flex flex-col gap-5">
                  <div className="border-b border-slate-900 pb-2">
                    <h3 className="text-lg font-bold text-white">Categorical Habits & Layouts</h3>
                    <p className="text-xs text-slate-400 mt-1">Lifestyle habits evaluated dynamically via Categorical Hamming Distance.</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Alcohol Tolerance</label>
                      <select 
                        value={alcohol} 
                        onChange={(e) => setAlcohol(Number(e.target.value))}
                        className="w-full bg-slate-950/60 rounded-xl px-4 py-3 border border-slate-800 outline-none text-slate-100 text-sm"
                      >
                        <option value={0}>Flexible</option>
                        <option value={1}>Strictly No</option>
                        <option value={2}>Strictly Yes</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Smoking Tolerance</label>
                      <select 
                        value={smoking} 
                        onChange={(e) => setSmoking(Number(e.target.value))}
                        className="w-full bg-slate-950/60 rounded-xl px-4 py-3 border border-slate-800 outline-none text-slate-100 text-sm"
                      >
                        <option value={0}>Flexible</option>
                        <option value={1}>Strictly No</option>
                        <option value={2}>Strictly Yes</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Food Preferences</label>
                      <select 
                        value={foodPref} 
                        onChange={(e) => setFoodPref(Number(e.target.value))}
                        className="w-full bg-slate-950/60 rounded-xl px-4 py-3 border border-slate-800 outline-none text-slate-100 text-sm"
                      >
                        <option value={0}>Flexible</option>
                        <option value={1}>Strictly Veg</option>
                        <option value={2}>Strictly Non-Veg</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Culinary Skills</label>
                      <select 
                        value={culSkills} 
                        onChange={(e) => setCulSkills(Number(e.target.value))}
                        className="w-full bg-slate-950/60 rounded-xl px-4 py-3 border border-slate-800 outline-none text-slate-100 text-sm"
                      >
                        <option value={0}>Sometimes</option>
                        <option value={1}>Expert / Professional</option>
                        <option value={2}>Never tried / Fast food reliance</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">BHK Apartment Configurations Preferred</label>
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mt-1">
                      <label className={`flex items-center justify-center p-3 rounded-xl border text-xs font-semibold cursor-pointer select-none transition-all ${bhk1 ? "bg-primary-500/20 text-primary-400 border-primary-500" : "bg-slate-950/40 border-slate-800 text-slate-400"}`}>
                        <input type="checkbox" checked={bhk1 === 1} onChange={(e) => setBhk1(e.target.checked ? 1 : 0)} className="hidden" />
                        1 BHK
                      </label>
                      <label className={`flex items-center justify-center p-3 rounded-xl border text-xs font-semibold cursor-pointer select-none transition-all ${bhk2 ? "bg-primary-500/20 text-primary-400 border-primary-500" : "bg-slate-950/40 border-slate-800 text-slate-400"}`}>
                        <input type="checkbox" checked={bhk2 === 1} onChange={(e) => setBhk2(e.target.checked ? 1 : 0)} className="hidden" />
                        2 BHK
                      </label>
                      <label className={`flex items-center justify-center p-3 rounded-xl border text-xs font-semibold cursor-pointer select-none transition-all ${bhk3 ? "bg-primary-500/20 text-primary-400 border-primary-500" : "bg-slate-950/40 border-slate-800 text-slate-400"}`}>
                        <input type="checkbox" checked={bhk3 === 1} onChange={(e) => setBhk3(e.target.checked ? 1 : 0)} className="hidden" />
                        3 BHK
                      </label>
                      <label className={`flex items-center justify-center p-3 rounded-xl border text-xs font-semibold cursor-pointer select-none transition-all ${bhk4 ? "bg-primary-500/20 text-primary-400 border-primary-500" : "bg-slate-950/40 border-slate-800 text-slate-400"}`}>
                        <input type="checkbox" checked={bhk4 === 1} onChange={(e) => setBhk4(e.target.checked ? 1 : 0)} className="hidden" />
                        4 BHK
                      </label>
                      <label className={`flex items-center justify-center p-3 rounded-xl border text-xs font-semibold cursor-pointer select-none transition-all ${hall ? "bg-primary-500/20 text-primary-400 border-primary-500" : "bg-slate-950/40 border-slate-800 text-slate-400"}`}>
                        <input type="checkbox" checked={hall === 1} onChange={(e) => setHall(e.target.checked ? 1 : 0)} className="hidden" />
                        PG / Hall
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Open to roommates of other Academic Branches?</label>
                    <div className="grid grid-cols-2 gap-4">
                      <button 
                        type="button" 
                        onClick={() => setOpenToOtherBranch(0)}
                        className={`py-3 rounded-xl border text-xs font-bold transition-all ${openToOtherBranch === 0 ? "bg-primary-500 text-slate-950 border-primary-500" : "bg-slate-950/40 border-slate-850 text-slate-400"}`}
                      >
                        Yes, Flexible
                      </button>
                      <button 
                        type="button" 
                        onClick={() => setOpenToOtherBranch(1)}
                        className={`py-3 rounded-xl border text-xs font-bold transition-all ${openToOtherBranch === 1 ? "bg-primary-500 text-slate-950 border-primary-500" : "bg-slate-950/40 border-slate-850 text-slate-400"}`}
                      >
                        No, Same Branch Only
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-4">
                    <button 
                      type="button" 
                      onClick={() => setWizardStep(2)}
                      className="py-3 px-6 bg-slate-900 border border-slate-800 hover:bg-slate-850 rounded-xl text-slate-400 text-sm font-semibold transition-all flex items-center gap-1.5"
                    >
                      <ChevronLeft className="w-4 h-4" /> Back
                    </button>
                    <button 
                      type="submit" 
                      disabled={wizardSubmitting}
                      className="py-3 px-8 bg-gradient-to-r from-primary-500 to-amber-500 text-slate-950 rounded-xl text-sm font-bold transition-all flex items-center gap-1.5 shadow-md shadow-primary-500/20 active:scale-95"
                    >
                      {wizardSubmitting ? "Persisting Vectors..." : "Save & Open Swiper"}
                      <Check className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </form>
          </div>
        </section>

        <footer className="relative z-10 w-full text-center py-6 text-xs text-slate-600 border-t border-slate-900/60">
          © 2026 Roommate Bumble Corporation. Dynamic distance vectors.
        </footer>
      </main>
    );
  }

  // View D: Fully Loaded Roommate SaaS Dashboard
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between overflow-x-hidden">
      {/* Background radial overlays */}
      <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-primary-500/5 to-transparent pointer-events-none" />

      {/* Primary Desktop Dashboard Header */}
      <header className="relative z-20 w-full max-w-7xl mx-auto px-6 py-4 flex items-center justify-between border-b border-slate-900/80 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-primary-500 to-amber-400 flex items-center justify-center font-bold text-slate-950 shadow-md text-sm">
            B
          </div>
          <span className="font-extrabold text-base tracking-wider hidden sm:inline">
            ROOMMATE<span className="text-primary-400">BUMBLE</span>
          </span>
        </div>

        {/* Dynamic Navigation Tabs */}
        <nav className="flex items-center gap-1 bg-slate-900/70 p-1 rounded-xl border border-slate-800/80 text-xs font-semibold">
          <button 
            onClick={() => setActiveTab("swipe")}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all duration-200 ${activeTab === "swipe" ? "bg-primary-500 text-slate-950" : "text-slate-400 hover:text-slate-200"}`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Bumble Mode</span>
          </button>
          <button 
            onClick={() => setActiveTab("chat")}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all duration-200 ${activeTab === "chat" ? "bg-primary-500 text-slate-950" : "text-slate-400 hover:text-slate-200"}`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Chats</span>
          </button>
          <button 
            onClick={() => setActiveTab("listings")}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all duration-200 ${activeTab === "listings" ? "bg-primary-500 text-slate-950" : "text-slate-400 hover:text-slate-200"}`}
          >
            <Home className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Flats</span>
          </button>
          <button 
            onClick={() => setActiveTab("requests")}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all duration-200 ${activeTab === "requests" ? "bg-primary-500 text-slate-950" : "text-slate-400 hover:text-slate-200"}`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Requests</span>
          </button>
          <button 
            onClick={() => setActiveTab("profile")}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all duration-200 ${activeTab === "profile" ? "bg-primary-500 text-slate-950" : "text-slate-400 hover:text-slate-200"}`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Preferences</span>
          </button>
        </nav>

        {/* User Context */}
        <div className="flex items-center gap-3">
          <div className="hidden lg:flex flex-col text-right">
            <span className="text-xs font-bold text-white">{profile?.name || "Active Student"}</span>
            <span className="text-[10px] text-primary-400 font-semibold tracking-wider uppercase">{profile?.course || "Course Study"}</span>
          </div>
          <button 
            onClick={handleAuthLogout}
            title="Log Out"
            className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800/80 text-slate-400 hover:text-red-400 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Dashboard Space */}
      <section className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 flex-1 flex flex-col justify-start">
        
        {/* TAB 1: BUMBLE SWIPER MODE */}
        {activeTab === "swipe" && (
          <div className="flex flex-col lg:flex-row items-start justify-center gap-6 py-4 flex-1 w-full max-w-5xl mx-auto">
            
            {/* Tweak Your Vibe Control Panel */}
            <div className="w-full lg:w-80 glass-panel rounded-3xl p-6 border border-slate-900 flex flex-col gap-6 shrink-0 mt-4 lg:mt-0">
              <div className="border-b border-slate-900 pb-3">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary-500" /> Tweak Your Vibe
                </h3>
                <p className="text-xs text-slate-400 mt-1">Real-time ML vector adjustments.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-2 flex justify-between">
                  <span>Rent Budget</span>
                  <span className="text-primary-400 font-bold">₹{rentBudget} / m</span>
                </label>
                <input 
                  type="range" 
                  min="1000" 
                  max="100000" 
                  step="500"
                  value={rentBudget} 
                  onChange={(e) => setRentBudget(Number(e.target.value))}
                  className="w-full accent-primary-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-2 flex justify-between">
                  <span>Distance from Uni</span>
                  <span className="text-primary-400 font-bold">{distFromUni} km</span>
                </label>
                <input 
                  type="range" 
                  min="0.5" 
                  max="30" 
                  step="0.5"
                  value={distFromUni} 
                  onChange={(e) => setDistFromUni(parseFloat(e.target.value))}
                  className="w-full accent-primary-500"
                />
              </div>
            </div>

            {/* Main Interactive Card Stack Area */}
            <div className="flex-1 flex flex-col items-center w-full relative">
              {/* Recalculating Overlay Indicator */}
              {isRecalculating && (
                <div className="absolute top-4 right-4 z-50 bg-slate-900/80 backdrop-blur-sm border border-primary-500/30 text-primary-400 text-[10px] uppercase tracking-widest font-bold px-3 py-1.5 rounded-full flex items-center gap-2 shadow-lg shadow-primary-500/10">
                  <Cpu className="w-3.5 h-3.5 animate-spin" />
                  Recalculating ML Vectors...
                </div>
              )}

              {candidatesLoading && !isRecalculating ? (
                <div className="text-center py-12">
                  <Cpu className="w-10 h-10 text-primary-500 animate-spin mx-auto mb-4" />
                  <p className="text-sm font-semibold text-slate-400 uppercase tracking-widest animate-pulse">Running ML Distance Equations...</p>
                </div>
              ) : candidates.length === 0 || swipeIndex >= candidates.length ? (
                <div className="max-w-md w-full glass-panel rounded-3xl p-8 text-center border border-slate-900 flex flex-col items-center gap-4 mt-4">
                <div className="w-16 h-16 rounded-full bg-primary-500/10 text-primary-400 flex items-center justify-center border border-primary-500/20">
                  <Sparkles className="w-8 h-8 animate-pulse" />
                </div>
                <h3 className="text-lg font-bold text-white mt-2">End of Swiper Deck</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  You've reviewed all roommate recommendations in your city. Check back later or adjust your study program/budget restrictions in settings.
                </p>
                <button 
                  onClick={fetchRecommendations}
                  className="py-2.5 px-6 mt-2 bg-slate-900 border border-slate-800 hover:bg-slate-850 rounded-xl text-primary-400 text-xs font-bold transition-all"
                >
                  Rerun Engine Recommendation
                </button>
              </div>
            ) : (
              // Main Interactive Card Stack
              <div className="w-full max-w-lg relative">
                {/* Active Recommendee Card */}
                {(() => {
                  const item = candidates[swipeIndex];
                  return (
                    <div className="glass-panel rounded-[32px] overflow-hidden shadow-2xl shadow-black/60 border border-slate-800 flex flex-col">
                      
                      {/* Top compatibility banner */}
                      <div className="bg-gradient-to-r from-primary-600 to-amber-500 p-4 px-6 flex items-center justify-between text-slate-950">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4" />
                          <span className="text-xs uppercase font-extrabold tracking-wider">Euclidean-Hamming Sorted</span>
                        </div>
                        <span className="text-sm font-extrabold bg-slate-950 text-primary-400 py-1 px-3 rounded-full border border-primary-400/20">
                          {item.compatibility}% Match
                        </span>
                      </div>

                      {/* Header Avatar and Basic Details */}
                      <div className="p-6 pb-4 border-b border-slate-900/60 flex items-start gap-4">
                        <img 
                          src={item.profile?.profileImage || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(item.name)}`}
                          alt={item.name}
                          className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 p-1 object-cover"
                        />
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-white flex items-center gap-2">
                            {item.name}
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-900 text-slate-400 border border-slate-800">
                              {item.profile?.gender === 0 ? "Male" : "Female"}
                            </span>
                          </h3>
                          <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-slate-400 mt-1">
                            <span className="flex items-center gap-1"><BookOpen className="w-3.5 h-3.5 text-primary-500" />{item.profile?.course}</span>
                            <span className="flex items-center gap-1"><Briefcase className="w-3.5 h-3.5 text-primary-500" />{item.profile?.workEx} yrs WorkEx</span>
                            <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-primary-500" />{item.profile?.hometown}</span>
                          </div>
                        </div>
                      </div>

                      {/* Math Feature vectors metrics details */}
                      <div className="p-6 py-4 border-b border-slate-900/60 grid grid-cols-2 gap-4 bg-slate-950/40">
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Rent Target Limit</span>
                          <span className="text-sm font-bold text-white flex items-center"><IndianRupee className="w-4 h-4 text-emerald-400" />₹{item.profile?.preferences?.rentBudget || 500} / m</span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Distance to Uni</span>
                          <span className="text-sm font-bold text-white">{item.profile?.preferences?.distFromUni || 5} km away</span>
                        </div>
                      </div>

                      {/* Profile Bio */}
                      {item.profile?.bio && (
                        <div className="p-6 py-4 border-b border-slate-900/60">
                          <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold block mb-1">About Me</span>
                          <p className="text-xs text-slate-300 leading-relaxed italic">"{item.profile.bio}"</p>
                        </div>
                      )}

                      {/* Mismatches Details Metrics comparing targets */}
                      <div className="p-6 py-4 flex-1">
                        <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold block mb-3">Lifestyle Metrics comparison</span>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          
                          {/* Alcohol Habit */}
                          <div className="p-2.5 rounded-2xl bg-slate-900/40 border border-slate-800 flex items-center justify-between text-[11px]">
                            <span className="text-slate-400 font-medium">Alcohol:</span>
                            <span className="font-semibold text-slate-200">
                              {item.profile?.preferences?.alcohol === 0 ? "Flexible" : item.profile?.preferences?.alcohol === 1 ? "Strictly No" : "Strictly Yes"}
                            </span>
                          </div>

                          {/* Smoking Habit */}
                          <div className="p-2.5 rounded-2xl bg-slate-900/40 border border-slate-800 flex items-center justify-between text-[11px]">
                            <span className="text-slate-400 font-medium">Smoking:</span>
                            <span className="font-semibold text-slate-200">
                              {item.profile?.preferences?.smoking === 0 ? "Flexible" : item.profile?.preferences?.smoking === 1 ? "Strictly No" : "Strictly Yes"}
                            </span>
                          </div>

                          {/* Food Habit */}
                          <div className="p-2.5 rounded-2xl bg-slate-900/40 border border-slate-800 flex items-center justify-between text-[11px]">
                            <span className="text-slate-400 font-medium">Dietary:</span>
                            <span className="font-semibold text-slate-200">
                              {item.profile?.preferences?.foodPref === 0 ? "Flexible" : item.profile?.preferences?.foodPref === 1 ? "Veg Only" : "Non-Veg Only"}
                            </span>
                          </div>
                        </div>

                        {/* Flat layouts preferred */}
                        <div className="mt-4 flex flex-wrap items-center gap-1.5">
                          <span className="text-[9px] text-slate-500 uppercase tracking-widest font-semibold mr-1.5">Preferred layout:</span>
                          {item.profile?.preferences?.bhk1 === 1 && <span className="text-[10px] bg-slate-900 border border-slate-800 py-1 px-2.5 rounded-full text-slate-400 font-semibold">1 BHK</span>}
                          {item.profile?.preferences?.bhk2 === 1 && <span className="text-[10px] bg-slate-900 border border-slate-800 py-1 px-2.5 rounded-full text-slate-400 font-semibold">2 BHK</span>}
                          {item.profile?.preferences?.bhk3 === 1 && <span className="text-[10px] bg-slate-900 border border-slate-800 py-1 px-2.5 rounded-full text-slate-400 font-semibold">3 BHK</span>}
                          {item.profile?.preferences?.bhk4 === 1 && <span className="text-[10px] bg-slate-900 border border-slate-800 py-1 px-2.5 rounded-full text-slate-400 font-semibold">4 BHK</span>}
                          {item.profile?.preferences?.hall === 1 && <span className="text-[10px] bg-slate-900 border border-slate-800 py-1 px-2.5 rounded-full text-slate-400 font-semibold">Hall</span>}
                        </div>
                      </div>

                      {/* Swiper Gesture Buttons */}
                      <div className="p-6 bg-slate-900/40 border-t border-slate-900/60 flex items-center justify-center gap-6">
                        <button 
                          onClick={() => recordSwipe(item.userId, false)}
                          disabled={swipeSubmitting}
                          title="Dislike / Pass"
                          className="w-14 h-14 rounded-full bg-slate-950 border border-slate-850/80 text-red-500 hover:bg-red-950/20 active:scale-90 transition-all flex items-center justify-center shadow-md shadow-black/40 cursor-pointer"
                        >
                          <X className="w-6 h-6" />
                        </button>
                        <button 
                          onClick={() => recordSwipe(item.userId, true)}
                          disabled={swipeSubmitting}
                          title="Like / Roommate Gesture"
                          className="w-16 h-16 rounded-full bg-gradient-to-tr from-primary-500 to-amber-400 text-slate-950 hover:brightness-110 active:scale-90 transition-all flex items-center justify-center shadow-lg shadow-primary-500/20 cursor-pointer"
                        >
                          <Heart className="w-8 h-8 fill-slate-950 stroke-slate-950" />
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
            </div>
          </div>
        )}

        {/* TAB 2: MUTUAL MATCHES & REAL-TIME CHAT */}
        {activeTab === "chat" && (
          <div className="flex flex-col lg:flex-row gap-6 flex-1 h-[75vh]">
            
            {/* Matches List Column */}
            <div className="w-full lg:w-80 glass-panel rounded-3xl p-6 flex flex-col border border-slate-900 h-full overflow-hidden">
              <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary-500" /> Roommate Matches
              </h3>
              
              {matchesLoading ? (
                <div className="flex-1 flex items-center justify-center text-xs text-slate-500 uppercase tracking-widest animate-pulse">
                  Querying Matches...
                </div>
              ) : matches.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 p-4">
                  <div className="p-3 bg-slate-900 rounded-2xl text-slate-500">
                    <MessageSquare className="w-6 h-6" />
                  </div>
                  <p className="text-xs text-slate-500">No mutual matches yet. Keep swiping on Bumble Mode!</p>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto flex flex-col gap-2">
                  {matches.map((m) => {
                    const isSelected = selectedMatch && selectedMatch.matchId === m.matchId;
                    return (
                      <button 
                        key={m.matchId}
                        onClick={() => selectConversation(m)}
                        className={`w-full p-3 rounded-2xl flex items-center gap-3 text-left transition-all ${isSelected ? "bg-primary-500 text-slate-950 shadow-md shadow-primary-500/10" : "bg-slate-900/40 hover:bg-slate-900 text-slate-200"}`}
                      >
                        <img 
                          src={m.user.profile?.profileImage || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(m.user.profile?.name || m.user.email)}`}
                          alt={m.user.profile?.name}
                          className="w-10 h-10 rounded-xl bg-slate-950 p-0.5 object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-bold truncate leading-tight">{m.user.profile?.name || "Student"}</h4>
                          <span className={`text-[10px] uppercase font-semibold tracking-wider ${isSelected ? "text-slate-800" : "text-primary-400"}`}>
                            {m.user.profile?.course || "Branch Study"}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Socket Conversational Workspace Column */}
            <div className="flex-1 glass-panel rounded-3xl overflow-hidden border border-slate-900 flex flex-col h-full bg-slate-950/20">
              {selectedMatch ? (
                <>
                  {/* Chat Header */}
                  <div className="p-4 px-6 border-b border-slate-900 flex items-center justify-between bg-slate-900/40">
                    <div className="flex items-center gap-3">
                      <img 
                        src={selectedMatch.user.profile?.profileImage || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(selectedMatch.user.profile?.name || selectedMatch.user.email)}`}
                        alt={selectedMatch.user.profile?.name}
                        className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-850 p-0.5 object-cover"
                      />
                      <div>
                        <h4 className="text-sm font-extrabold text-white leading-tight">{selectedMatch.user.profile?.name}</h4>
                        <span className="text-[10px] text-slate-400">{selectedMatch.user.email}</span>
                      </div>
                    </div>
                  </div>

                  {/* Messages History Area */}
                  <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-4">
                    {messagesLoading ? (
                      <div className="flex-1 flex items-center justify-center text-xs text-slate-500 uppercase tracking-widest animate-pulse">
                        Retrieving Chat Logs...
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="flex-1 flex flex-col items-center justify-center text-center gap-2 p-6">
                        <Sparkles className="w-8 h-8 text-primary-500/40 animate-bounce" />
                        <h4 className="text-sm font-bold text-white mt-1">Chat Connection Secure</h4>
                        <p className="text-xs text-slate-500 max-w-xs">Break the ice! Ask about flat details or co-living schedules.</p>
                      </div>
                    ) : (
                      messages.map((msg) => {
                        const isOwn = msg.senderId === user.id;
                        return (
                          <div 
                            key={msg.id || msg.createdAt} 
                            className={`flex flex-col max-w-[70%] ${isOwn ? "self-end items-end" : "self-start items-start"}`}
                          >
                            <div className={`p-3.5 rounded-[20px] text-xs font-medium leading-relaxed ${isOwn ? "bg-primary-500 text-slate-950 rounded-tr-none shadow-sm shadow-primary-500/10" : "bg-slate-900 border border-slate-850/80 text-slate-100 rounded-tl-none"}`}>
                              {msg.content}
                            </div>
                            <span className="text-[9px] text-slate-500 font-semibold mt-1 px-1">
                              {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        );
                      })
                    )}
                    <div ref={chatBottomRef} />
                  </div>

                  {/* Send Input Area */}
                  <form onSubmit={sendChatMessage} className="p-4 bg-slate-900/30 border-t border-slate-900 flex gap-2">
                    <input 
                      type="text" 
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Write your roommate introduction..."
                      className="flex-1 bg-slate-950/80 rounded-xl px-4 py-3 border border-slate-850 focus:border-primary-500 outline-none text-slate-100 text-xs transition-colors"
                    />
                    <button 
                      type="submit"
                      className="p-3 bg-primary-500 text-slate-950 hover:bg-primary-600 rounded-xl transition-all flex items-center justify-center shadow-md active:scale-90"
                    >
                      <Send className="w-4 h-4 fill-slate-950 stroke-slate-950" />
                    </button>
                  </form>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 p-8">
                  <div className="p-4 bg-slate-900 rounded-3xl text-primary-500/20 border border-slate-800">
                    <MessageSquare className="w-8 h-8" />
                  </div>
                  <h4 className="text-sm font-bold text-white mt-1">Converse Instantly</h4>
                  <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
                    Select a co-living buddy from the matches list on the left to activate secure Socket.IO pipelines.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: FLAT & ROOM LISTINGS FEED */}
        {activeTab === "listings" && (
          <div className="flex flex-col gap-6 flex-1">
            
            {/* Header & Post trigger */}
            <div className="flex items-center justify-between border-b border-slate-900 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white">Co-Living Properties Directory</h3>
                <p className="text-xs text-slate-400 mt-1">Browse flats available for sharing with roommates.</p>
              </div>
              <button 
                onClick={() => setIsPostModalOpen(true)}
                className="py-2.5 px-4 bg-gradient-to-r from-primary-500 to-amber-500 text-slate-950 rounded-xl text-xs font-bold transition-all shadow-md shadow-primary-500/10 flex items-center gap-1.5 hover:brightness-110 active:scale-95 cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[3px]" /> Advertise Flat
              </button>
            </div>

            {listingsLoading ? (
              <div className="text-center py-12">
                <Cpu className="w-10 h-10 text-primary-500 animate-spin mx-auto mb-4" />
                <p className="text-sm font-semibold text-slate-400 uppercase tracking-widest animate-pulse">Scanning Listings...</p>
              </div>
            ) : listings.length === 0 ? (
              <div className="max-w-md mx-auto w-full glass-panel rounded-3xl p-8 text-center flex flex-col items-center gap-4 border border-slate-900 mt-6">
                <div className="w-12 h-12 rounded-2xl bg-slate-900 text-slate-500 flex items-center justify-center border border-slate-800">
                  <Home className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-white mt-1">No Flats Listed Yet</h4>
                <p className="text-xs text-slate-500 leading-relaxed max-w-xs">Be the first to list your flat or room to find immediate roommates!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {listings.map((l) => {
                  const isOwner = l.userId === user.id;
                  return (
                    <div key={l.id} className="glass-panel rounded-3xl overflow-hidden shadow-lg border border-slate-850 flex flex-col transition-all duration-300 hover:-translate-y-1">
                      <img 
                        src={l.images[0] || "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=600&q=80"}
                        alt={l.title}
                        className="w-full h-44 object-cover border-b border-slate-900/60"
                      />
                      <div className="p-6 flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-base font-extrabold text-white leading-tight block truncate mr-2">{l.title}</span>
                            <span className="text-xs font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-900/30 px-2 py-0.5 rounded-full shrink-0">
                              ₹{l.rent} / m
                            </span>
                          </div>

                          <div className="flex items-center gap-1 text-[11px] text-slate-500 font-semibold mb-3">
                            <MapPin className="w-3.5 h-3.5 text-primary-500 shrink-0" />
                            <span className="truncate">{l.address}</span>
                          </div>

                          <p className="text-xs text-slate-400 leading-relaxed mb-4 line-clamp-3">{l.description}</p>

                          {l.amenities.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mb-4">
                              {l.amenities.map((a: string, index: number) => (
                                <span key={index} className="text-[10px] bg-slate-900 border border-slate-850 py-0.5 px-2 rounded-full text-slate-400 font-semibold">
                                  {a}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="pt-4 border-t border-slate-900 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <img 
                              src={l.user.profile?.profileImage || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(l.user.email)}`}
                              alt={l.user.profile?.name}
                              className="w-6 h-6 rounded-full bg-slate-950 object-cover"
                            />
                            <span className="text-[10px] text-slate-400 font-semibold">{l.user.profile?.name || "Advertiser"}</span>
                          </div>
                          {isOwner && (
                            <button 
                              onClick={() => handleDeleteListing(l.id)}
                              className="text-[10px] font-bold text-red-500 hover:text-red-400 transition-colors"
                            >
                              Delete Listing
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: INCOMING REQUESTS */}
        {activeTab === "requests" && (
          <div className="flex flex-col gap-6 py-4 flex-1 w-full max-w-7xl mx-auto">
            <div className="glass-panel rounded-3xl p-8 border border-slate-900">
              <div className="border-b border-slate-900 pb-4 mb-6">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <UserCheck className="w-6 h-6 text-primary-500" /> Pending Requests
                </h3>
                <p className="text-sm text-slate-400 mt-1">Users who swiped right on your profile. Approve them to start chatting!</p>
              </div>

              {requestsLoading ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-4">
                  <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-sm font-semibold animate-pulse">Loading vectors...</p>
                </div>
              ) : requests.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
                  <div className="w-16 h-16 rounded-full bg-slate-900/50 flex items-center justify-center mb-2">
                    <UserCheck className="w-8 h-8 text-slate-600" />
                  </div>
                  <p className="text-base font-semibold">No pending roommate requests right now.</p>
                  <p className="text-sm">Keep swiping to discover matches!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {requests.map((req) => (
                    <div key={req.swipeId} className="glass-panel rounded-3xl p-6 border border-slate-850 flex flex-col gap-4 relative overflow-hidden group">
                      <div className="flex items-start gap-4">
                        <img 
                          src={req.user.profile?.profileImage || `https://api.dicebear.com/7.x/adventurer/svg?seed=${req.user.profile?.name}`} 
                          alt="Avatar" 
                          className="w-16 h-16 rounded-2xl object-cover bg-slate-900"
                        />
                        <div className="flex flex-col">
                          <h4 className="text-lg font-bold text-white">{req.user.profile?.name || "Anonymous"}</h4>
                          <span className="text-xs text-primary-400 font-semibold">{req.user.profile?.course || "Student"}</span>
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-2 mt-2">
                        <div className="flex items-center justify-between text-xs border-b border-slate-800/50 pb-2">
                          <span className="text-slate-400">Rent Budget</span>
                          <span className="text-white font-bold">₹{req.user.preferences?.rentBudget || "N/A"}/mo</span>
                        </div>
                        <div className="flex items-center justify-between text-xs pb-1">
                          <span className="text-slate-400">Campus Distance</span>
                          <span className="text-white font-bold">{req.user.preferences?.distFromUni || "N/A"} km</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 mt-auto pt-4 border-t border-slate-800">
                        <button 
                          onClick={() => {
                            recordSwipe(req.user.id, false);
                            setRequests(prev => prev.filter(r => r.swipeId !== req.swipeId));
                          }}
                          className="flex-1 py-2.5 rounded-xl bg-slate-900 hover:bg-red-950/40 text-slate-300 hover:text-red-400 border border-slate-800 hover:border-red-900/50 text-xs font-bold transition-colors"
                        >
                          Decline
                        </button>
                        <button 
                          onClick={() => {
                            recordSwipe(req.user.id, true);
                            setRequests(prev => prev.filter(r => r.swipeId !== req.swipeId));
                          }}
                          className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-primary-500 to-amber-500 text-slate-950 font-bold text-xs shadow-md shadow-primary-500/20 active:scale-95 transition-all"
                        >
                          Approve
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: MY PROFILE / SETTINGS */}
        {activeTab === "profile" && (
          <div className="max-w-2xl mx-auto w-full glass-panel rounded-3xl p-8 border border-slate-900">
            <div className="border-b border-slate-900 pb-4 mb-6 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-primary-500" /> Vector Profile Settings
                </h3>
                <p className="text-xs text-slate-400 mt-1">Adjust study and budget constraints to calculate new distances.</p>
              </div>
              <button 
                onClick={handleWizardSubmit}
                disabled={wizardSubmitting}
                className="py-2 px-5 bg-primary-500 hover:bg-primary-600 text-slate-950 text-xs font-extrabold rounded-xl transition-all shadow-md shadow-primary-500/10"
              >
                {wizardSubmitting ? "Updating..." : "Save Adjustments"}
              </button>
            </div>

            {/* Profile Inputs */}
            <div className="flex flex-col gap-6">
              {/* Avatar Upload component */}
              <div className="flex items-center gap-4 bg-slate-900/40 p-4 rounded-2xl border border-slate-850">
                <div className="relative w-16 h-16 rounded-2xl bg-slate-950 border border-slate-850 flex items-center justify-center overflow-hidden">
                  {profileImage ? (
                    <img src={profileImage} alt="Avatar Preview" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-8 h-8 text-slate-605" />
                  )}
                  {isUploadingAvatar && (
                    <div className="absolute inset-0 bg-slate-950/70 flex items-center justify-center">
                      <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold text-white">Profile Photo</span>
                  <span className="text-[10px] text-slate-500">Only JPG, PNG or WEBP. Max 5MB.</span>
                  <label className="inline-flex items-center justify-center px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-white rounded-lg text-[10px] font-bold cursor-pointer transition-colors w-fit border border-slate-700 mt-1">
                    Choose File
                    <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">Display Name</label>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-slate-950/60 rounded-xl px-4 py-2.5 border border-slate-850 focus:border-primary-500 outline-none text-slate-100 text-xs" />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">Academic Course</label>
                  <select 
                    value={course} 
                    onChange={(e) => setCourse(e.target.value)}
                    className="w-full bg-slate-950/60 rounded-xl px-4 py-2.5 border border-slate-850 outline-none text-slate-100 text-xs"
                  >
                    <option value="" disabled>Select your course</option>
                    {ACADEMIC_COURSES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">Rent Budget</label>
                  <input type="number" value={rentBudget} onChange={(e) => setRentBudget(Number(e.target.value))} className="w-full bg-slate-950/60 rounded-xl px-4 py-2.5 border border-slate-850 focus:border-primary-500 outline-none text-slate-100 text-xs" />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">Uni Distance Limit (km)</label>
                  <input type="number" value={distFromUni} onChange={(e) => setDistFromUni(parseFloat(e.target.value))} className="w-full bg-slate-950/60 rounded-xl px-4 py-2.5 border border-slate-850 focus:border-primary-500 outline-none text-slate-100 text-xs" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">Hometown</label>
                <input type="text" value={hometown} onChange={(e) => setHometown(e.target.value)} className="w-full bg-slate-950/60 rounded-xl px-4 py-2.5 border border-slate-850 focus:border-primary-500 outline-none text-slate-100 text-xs" />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">Short Bio</label>
                <textarea rows={3} value={bio} onChange={(e) => setBio(e.target.value)} className="w-full bg-slate-950/60 rounded-xl px-4 py-2.5 border border-slate-850 focus:border-primary-500 outline-none text-slate-100 text-xs resize-none" />
              </div>
            </div>
          </div>
        )}
      </section>

      {/* MODAL 1: MATCH CELEBRATION OVERLAY */}
      {lastMatch && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-6 transition-all duration-300">
          <div className="max-w-md w-full glass-panel rounded-[32px] p-8 border border-primary-500/30 text-center flex flex-col items-center gap-6 shadow-2xl animate-in zoom-in-95 duration-200">
            
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/10 text-amber-400 border border-amber-400/20 text-xs font-semibold uppercase tracking-widest animate-bounce">
              <Sparkles className="w-3.5 h-3.5" /> Mutual Swipes Match!
            </div>

            <h2 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-300 leading-tight">
              It's a Match! 🎉
            </h2>

            <p className="text-slate-400 text-sm leading-relaxed">
              You and <span className="text-white font-bold">{lastMatch.user.name}</span> liked each other. You can now chat in real-time.
            </p>

            <div className="flex items-center gap-4 my-2">
              <img 
                src={profile?.profileImage || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(profile?.name || "me")}`}
                alt="Me"
                className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 p-0.5 object-cover"
              />
              <Heart className="w-8 h-8 fill-primary-500 stroke-primary-500 text-primary-500 animate-pulse" />
              <img 
                src={lastMatch.user.profile?.profileImage || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(lastMatch.user.name)}`}
                alt="Candidate"
                className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 p-0.5 object-cover"
              />
            </div>

            <div className="flex flex-col gap-2 w-full mt-2">
              <button 
                onClick={() => {
                  setActiveTab("chat");
                  selectConversation({
                    matchId: lastMatch.matchId,
                    user: {
                      id: lastMatch.user.userId,
                      email: lastMatch.user.profile?.preferences?.user?.email || "",
                      profile: lastMatch.user.profile
                    }
                  });
                  setLastMatch(null);
                }}
                className="w-full py-3 bg-gradient-to-r from-primary-500 to-amber-500 rounded-xl font-bold text-slate-950 shadow-md shadow-primary-500/20 hover:brightness-110 transition-all text-xs"
              >
                Send Direct Message
              </button>
              <button 
                onClick={() => setLastMatch(null)}
                className="w-full py-3 bg-slate-900 hover:bg-slate-850 rounded-xl text-slate-400 font-semibold border border-slate-800 text-xs transition-all"
              >
                Keep Swiping
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: WRITE FLAT DIRECTORY LISTING */}
      {isPostModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="max-w-md w-full glass-panel rounded-3xl p-8 border border-slate-800 flex flex-col gap-5">
            <div className="border-b border-slate-900 pb-2 flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Advertise Co-Living Option</h3>
              <button onClick={() => setIsPostModalOpen(false)} className="text-slate-500 hover:text-slate-300">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePostListing} className="flex flex-col gap-4">
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5">Property Title</label>
                <input 
                  type="text" 
                  value={listTitle} 
                  onChange={(e) => setListTitle(e.target.value)}
                  placeholder="E.g., Fully Furnished 2BHK near Campus" 
                  className="w-full bg-slate-950/60 rounded-xl px-4 py-2.5 border border-slate-850 focus:border-primary-500 outline-none text-slate-100 text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5">Rent budget (₹ / month)</label>
                  <input 
                    type="number" 
                    value={listRent} 
                    onChange={(e) => setListRent(Number(e.target.value))}
                    className="w-full bg-slate-950/60 rounded-xl px-4 py-2.5 border border-slate-850 focus:border-primary-500 outline-none text-slate-100 text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5">Full Address</label>
                  <input 
                    type="text" 
                    value={listAddress} 
                    onChange={(e) => setListAddress(e.target.value)}
                    placeholder="E.g., 42, Park Lane, Uni-Road" 
                    className="w-full bg-slate-950/60 rounded-xl px-4 py-2.5 border border-slate-850 focus:border-primary-500 outline-none text-slate-100 text-xs"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5">Amenities (Comma separated)</label>
                <input 
                  type="text" 
                  value={listAmenities} 
                  onChange={(e) => setListAmenities(e.target.value)}
                  placeholder="WiFi, AC, Kitchen, Parking" 
                  className="w-full bg-slate-950/60 rounded-xl px-4 py-2.5 border border-slate-850 focus:border-primary-500 outline-none text-slate-100 text-xs"
                />
              </div>

              {/* Image Upload for Listing */}
              <div className="flex flex-col gap-2">
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Property Photos</label>
                
                <div className="flex flex-wrap gap-2 animate-in fade-in duration-300">
                  {uploadedListingImages.map((img, idx) => (
                    <div key={idx} className="relative w-16 h-16 rounded-xl border border-slate-800 overflow-hidden group shrink-0">
                      <img src={img} alt="Property" className="w-full h-full object-cover" />
                      <button 
                        type="button"
                        onClick={() => setUploadedListingImages((prev) => prev.filter((_, i) => i !== idx))}
                        className="absolute top-1 right-1 p-1 rounded-full bg-red-650 hover:bg-red-750 text-white transition-colors"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  ))}
                  
                  {isUploadingListing ? (
                    <div className="w-16 h-16 rounded-xl border border-dashed border-slate-850 bg-slate-900/40 flex items-center justify-center shrink-0">
                      <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : (
                    <label className="w-16 h-16 rounded-xl border border-dashed border-slate-800 hover:border-slate-700 bg-slate-900/45 flex flex-col items-center justify-center cursor-pointer transition-colors group shrink-0">
                      <Plus className="w-4 h-4 text-slate-500 group-hover:text-slate-350 transition-colors" />
                      <span className="text-[8px] text-slate-600 font-bold uppercase mt-1">Upload</span>
                      <input type="file" accept="image/*" onChange={handleListingImageUpload} className="hidden" />
                    </label>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5">Property Description</label>
                <textarea 
                  value={listDesc} 
                  onChange={(e) => setListDesc(e.target.value)}
                  placeholder="Describe roommates space, building features, and utilities cost sharing..." 
                  rows={3}
                  className="w-full bg-slate-950/60 rounded-xl px-4 py-2.5 border border-slate-850 focus:border-primary-500 outline-none text-slate-100 text-xs resize-none"
                  required
                />
              </div>

              <button 
                type="submit"
                disabled={listSubmitting}
                className="w-full py-3 mt-2 bg-gradient-to-r from-primary-500 to-amber-500 rounded-xl font-bold text-slate-950 text-xs shadow-md active:scale-95 hover:brightness-110 transition-all"
              >
                {listSubmitting ? "Publishing Property..." : "Submit Listing Ad"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Global Dashboard Footer */}
      <footer className="relative z-20 w-full max-w-7xl mx-auto px-6 py-6 border-t border-slate-900/80 text-center text-[11px] text-slate-600">
        © 2026 Roommate Bumble Corporation. Secure Double Token Protection with Dynamic Vector Matrix.
      </footer>
    </main>
  );
}
