import { HiristService } from "../../services/hiristService";
import { JobMatcher, UserProfile } from "../../services/jobMatcher";
import { HiristSearchResponse } from "../../types/hirist";

async function run(){
    const hirist = new HiristService();

    const userProfile: UserProfile = {
        skills: ["Python", "Microservices Architecture", "Distributed Systems", "SQL"],
        yearsOfExperience: 6,
        preferredLocations: ["Bangalore"],
        remoteOnly: false,
    };

    try {
        const rawData = await hirist.searchJobs("Python", 0, 20);
        const response = rawData as HiristSearchResponse;

        const matchedResults = await JobMatcher.matchAll(response.data, userProfile, 40);
        console.log(`Evaluated ${response.data.length} jobs. Matched: ${matchedResults.length}`);
        console.dir(matchedResults, { depth: null, colors: true });
    }
    catch(error) {
        console.error("Pipeline failed:", error);
    }
}

run();