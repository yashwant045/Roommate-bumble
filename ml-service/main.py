from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler
from sklearn.metrics.pairwise import euclidean_distances
from scipy.spatial.distance import hamming
import time

app = FastAPI(
    title="Roommate Bumble ML Service",
    description="FastAPI Microservice for Roommate Recommendations",
    version="1.0.0"
)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ProfileInput(BaseModel):
    userId: str
    name: str
    gender: int
    currentCity: str
    hometown: str
    course: str
    workEx: float
    needRoommate: bool
    
    # Preferences
    rentBudget: int
    distFromUni: float
    maxPpr: int
    alcohol: int
    smoking: int
    foodPref: int
    culSkills: int
    bhk1: int
    bhk2: int
    bhk3: int
    bhk4: int
    hall: int
    openToOtherBranch: int

class RecommendationRequest(BaseModel):
    target: ProfileInput
    candidates: List[ProfileInput]
    alpha: float = 1.0
    beta: float = 1.0

class MatchResult(BaseModel):
    userId: str
    name: str
    score: float
    compatibility: float

class RecommendationResponse(BaseModel):
    success: bool
    matches: List[MatchResult]

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "ml-service",
        "timestamp": time.time(),
        "message": "FastAPI Roommate Recommendation Microservice is active!"
    }

@app.post("/recommendations", response_model=RecommendationResponse)
def get_recommendations(req: RecommendationRequest):
    target = req.target
    candidates = req.candidates
    alpha = req.alpha
    beta = req.beta

    if not candidates:
        return {"success": True, "matches": []}

    # 1. Prepare continuous features: ['workEx', 'distFromUni', 'rentBudget']
    target_cont = np.array([target.workEx, target.distFromUni, target.rentBudget]).reshape(1, -1)
    
    candidates_cont = []
    for c in candidates:
        candidates_cont.append([c.workEx, c.distFromUni, c.rentBudget])
    candidates_cont = np.array(candidates_cont)

    # Standardize continuous variables (StandardScaler expects stacked matrix)
    try:
        to_std = np.vstack((target_cont, candidates_cont))
        all_std = StandardScaler().fit_transform(to_std)
        target_std = all_std[0, :].reshape(1, -1)
        candidates_std = all_std[1:, :]
        
        # Calculate continuous Euclidean distances
        dist_cont = euclidean_distances(target_std, candidates_std).flatten()
    except Exception as e:
        # Fallback if standardization errors out due to empty values or single inputs
        print(f"Continuous standardisation warning: {e}")
        dist_cont = np.zeros(len(candidates))

    # 2. Prepare categorical features
    # Determine all unique courses in target + candidates to perform dynamic one-hot encoding
    all_courses = list(set([target.course] + [c.course for c in candidates]))
    
    def get_categorical_vector(profile: ProfileInput) -> list:
        # Static categoricals: gender, currentCity, hometown, needRoommate, openToOtherBranch, maxPpr, habits
        vector = [
            profile.gender,
            profile.currentCity.lower().strip(),
            profile.hometown.lower().strip(),
            1 if profile.needRoommate else 0,
            profile.openToOtherBranch,
            profile.maxPpr,
            profile.bhk1,
            profile.bhk2,
            profile.bhk3,
            profile.bhk4,
            profile.hall,
            profile.alcohol,
            profile.smoking,
            profile.foodPref,
            profile.culSkills
        ]
        # Course dynamic one-hot vector encoding
        course_vector = [1 if profile.course == course else 0 for course in all_courses]
        return vector + course_vector

    target_cat = get_categorical_vector(target)
    
    # Calculate categorical Hamming distances
    dist_cat = []
    for c in candidates:
        c_cat = get_categorical_vector(c)
        # scipy.hamming returns the fraction of differing dimensions
        h_dist = hamming(target_cat, c_cat)
        dist_cat.append(h_dist)
    dist_cat = np.array(dist_cat)

    # 3. Create final distance matrix
    final_dist = alpha * dist_cont + beta * dist_cat

    # 4. Generate Match results
    results = []
    for idx, c in enumerate(candidates):
        raw_score = float(final_dist[idx])
        # Smooth Sigmoid compatibility percentage mapping: 100 / (1 + distance)
        compatibility_pct = round(100.0 / (1.0 + raw_score), 1)
        
        results.append(MatchResult(
            userId=c.userId,
            name=c.name,
            score=raw_score,
            compatibility=compatibility_pct
        ))

    # Sort candidates by descending compatibility (higher compatibility is better)
    results.sort(key=lambda x: x.compatibility, reverse=True)

    return {
        "success": True,
        "matches": results
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
