// School Exam Structures - Dynamic Config Helper
// Handles localStorage and Supabase DB synchronization for custom configurations

const DEFAULT_EXAMS = [
    { name: "Monthly Test 1", totalMarks: 50 },
    { name: "Monthly Test 2", totalMarks: 50 },
    { name: "Monthly Test 3", totalMarks: 50 },
    { name: "Quarterly Exam", totalMarks: 100 },
    { name: "Half Yearly Exam", totalMarks: 100 },
    { name: "Model Exam", totalMarks: 100 },
    { name: "Annual Exam", totalMarks: 100 }
];

const SEEDED_SCHOOL_STRUCTURES = {
    "Default": {
        exams: DEFAULT_EXAMS
    }
};

const DEFAULT_ACADEMIC_GROUPS = {
    "Class 10 & below": ["Tamil", "English", "Maths", "Science", "Social"],
    "Bio Maths": ["Tamil", "English", "Physics", "Chemistry", "Maths", "Biology"],
    "Computer Science": ["Tamil", "English", "Physics", "Chemistry", "Maths", "Computer Science"],
    "Commerce": ["Tamil", "English", "Accountancy", "Commerce", "Economics", "Computer Application"]
};

// Local caching layer
let cachedSchoolStructures = null;
let cachedAcademicGroups = null;

// SYNC SETTINGS FROM SUPABASE
async function syncPortalSettingsFromDB() {
    try {
        if (typeof _supabase === 'undefined') return;
        const { data, error } = await _supabase
            .from('portal_settings')
            .select('*');
            
        if (error) {
            console.warn("DB settings table not yet created or inaccessible:", error.message);
            return;
        }
        
        data.forEach(item => {
            if (item.key === 'school_exam_structures' && item.value && Object.keys(item.value).length > 0) {
                cachedSchoolStructures = item.value;
                localStorage.setItem("school_exam_structures", JSON.stringify(item.value));
            } else if (item.key === 'academic_groups' && item.value && Object.keys(item.value).length > 0) {
                cachedAcademicGroups = item.value;
                localStorage.setItem("academic_groups", JSON.stringify(item.value));
            }
        });
        
        console.log("Portal settings synchronized from database.");
    } catch (e) {
        console.error("Exception in settings DB sync:", e);
    }
}

// Retrieve all structures
function getSchoolStructures() {
    if (cachedSchoolStructures && Object.keys(cachedSchoolStructures).length > 0) return cachedSchoolStructures;
    let stored = localStorage.getItem("school_exam_structures");
    if (!stored) {
        localStorage.setItem("school_exam_structures", JSON.stringify(SEEDED_SCHOOL_STRUCTURES));
        cachedSchoolStructures = SEEDED_SCHOOL_STRUCTURES;
        return SEEDED_SCHOOL_STRUCTURES;
    }
    try {
        let parsed = JSON.parse(stored);
        if (!parsed || Object.keys(parsed).length === 0) {
            parsed = SEEDED_SCHOOL_STRUCTURES;
            localStorage.setItem("school_exam_structures", JSON.stringify(SEEDED_SCHOOL_STRUCTURES));
        }
        
        // Auto-upgrade existing default configurations to include Model Exam in correct order
        if (parsed.Default && parsed.Default.exams) {
            let hasModel = parsed.Default.exams.some(e => e.name.toLowerCase().includes("model"));
            if (!hasModel) {
                let hyIndex = parsed.Default.exams.findIndex(e => e.name.toLowerCase().includes("half"));
                if (hyIndex >= 0) {
                    parsed.Default.exams.splice(hyIndex + 1, 0, { name: "Model Exam", totalMarks: 100 });
                } else {
                    parsed.Default.exams.push({ name: "Model Exam", totalMarks: 100 });
                }
                localStorage.setItem("school_exam_structures", JSON.stringify(parsed));
            }
        }
        cachedSchoolStructures = parsed;
        return parsed;
    } catch (e) {
        console.error("Error parsing school_exam_structures from localStorage", e);
        cachedSchoolStructures = SEEDED_SCHOOL_STRUCTURES;
        return SEEDED_SCHOOL_STRUCTURES;
    }
}

// Save all structures
async function saveSchoolStructures(structures) {
    cachedSchoolStructures = structures;
    localStorage.setItem("school_exam_structures", JSON.stringify(structures));
    
    try {
        if (typeof _supabase !== 'undefined') {
            await _supabase
                .from('portal_settings')
                .upsert({ key: 'school_exam_structures', value: structures });
        }
    } catch (e) {
        console.error("Failed to upload school structures to DB", e);
    }
}

// Get structure for a single school
function getSchoolStructure(schoolName) {
    let structures = getSchoolStructures();
    let normalized = (schoolName || "").trim().toLowerCase();
    
    if (!normalized) {
        return structures["Default"] || { exams: DEFAULT_EXAMS };
    }

    for (let key in structures) {
        if (key.trim().toLowerCase() === normalized) {
            return structures[key];
        }
    }
    
    // Fallback: seed dynamically
    structures[schoolName.trim()] = { exams: JSON.parse(JSON.stringify(DEFAULT_EXAMS)) };
    saveSchoolStructures(structures);
    return structures[schoolName.trim()];
}

// Dynamic Academic Groups Configurations
function getAcademicGroups() {
    if (cachedAcademicGroups && Object.keys(cachedAcademicGroups).length > 0) return cachedAcademicGroups;
    let stored = localStorage.getItem("academic_groups");
    if (!stored) {
        localStorage.setItem("academic_groups", JSON.stringify(DEFAULT_ACADEMIC_GROUPS));
        cachedAcademicGroups = DEFAULT_ACADEMIC_GROUPS;
        return DEFAULT_ACADEMIC_GROUPS;
    }
    try {
        let parsed = JSON.parse(stored);
        if (!parsed || Object.keys(parsed).length === 0) {
            parsed = DEFAULT_ACADEMIC_GROUPS;
            localStorage.setItem("academic_groups", JSON.stringify(DEFAULT_ACADEMIC_GROUPS));
        }
        cachedAcademicGroups = parsed;
        return parsed;
    } catch (e) {
        console.error("Error parsing academic_groups from localStorage", e);
        cachedAcademicGroups = DEFAULT_ACADEMIC_GROUPS;
        return DEFAULT_ACADEMIC_GROUPS;
    }
}

async function saveAcademicGroups(groups) {
    cachedAcademicGroups = groups;
    localStorage.setItem("academic_groups", JSON.stringify(groups));
    
    try {
        if (typeof _supabase !== 'undefined') {
            await _supabase
                .from('portal_settings')
                .upsert({ key: 'academic_groups', value: groups });
        }
    } catch (e) {
        console.error("Failed to upload academic groups to DB", e);
    }
}
