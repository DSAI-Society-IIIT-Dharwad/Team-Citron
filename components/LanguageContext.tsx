"use client";
import React, { createContext, useContext, useState } from "react";

type Language = "English" | "Hindi";

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: string) => string;
}

const translations = {
    English: {
        transcripts: "Transcripts",
        transcripts_empty: "Your transcripts will appear here.",
        analytics: "Analytics",
        analytics_desc: "Analytics on entity extraction, frequency, and transcript processing will be displayed here.",
        profile: "Profile & Settings",
        account_details: "Account Details",
        settings: "Settings",
        preferences_desc: "More preferences will appear here as the app grows.",
        record_audio: "Record Audio",
        capture_voice: "Capture your voice and watch it turn into text instantly.",
        recording: "Recording... Click to stop",
        click_to_start: "Click to start recording",
        processing: "Processing Audio...",
        transcript_label: "Transcript",
        no_transcript: "No transcript yet. Record something to see the magic!",
        sign_out: "Sign Out",
        ambient_title: "Enable Ambient Audio Recording?",
        ambient_desc_1: "Ambient Recording continuously listens to your audio and transcripts them.",
        ambient_desc_2: "Worried about security? Don't worry, we only listen for finance specific words.",
        ambient_desc_3: "You can always disable this option in settings.",
        enable: "Enable",
        skip: "Skip",
        ambient_live: "Ambient Recording is Live",
        ambient_off: "Ambient Recording is Off",
        allow_ambient_recording: "Allow Ambient Recording",
    },
    Hindi: {
        transcripts: "रिकॉर्डिंग",
        transcripts_empty: "आपकी रिकॉर्डिंग यहां दिखाई देंगी।",
        analytics: "एनालिटिक्स",
        analytics_desc: "आपकी एनालिटिक्स यहां दिखाई देंगी।",
        profile: "प्रोफ़ाइल और सेटिंग्स",
        account_details: "खाता विवरण",
        settings: "सेटिंग्स",
        preferences_desc: "ऐप के बढ़ने पर और प्राथमिकताएं यहां दिखाई देंगी।",
        record_audio: "ऑडियो रिकॉर्ड करें",
        capture_voice: "अपनी आवाज़ कैप्चर करें और इसे तुरंत टेक्स्ट में बदलते देखें।",
        recording: "रिकॉर्डिंग हो रही है... रोकने के लिए क्लिक करें",
        click_to_start: "रिकॉर्डिंग शुरू करने के लिए क्लिक करें",
        processing: "ऑडियो प्रोसेस हो रहा है...",
        transcript_label: "ट्रांसक्रिप्ट",
        no_transcript: "अभी तक कोई ट्रांसक्रिप्ट नहीं। जादू देखने के लिए कुछ रिकॉर्ड करें!",
        sign_out: "साइन आउट करें",
        ambient_title: "क्या एम्बिएंट ऑडियो रिकॉर्डिंग सक्षम करें?",
        ambient_desc_1: "एम्बिएंट रिकॉर्डिंग लगातार आपकी ऑडियो सुनती है और उन्हें ट्रांसक्रिप्ट करती है।",
        ambient_desc_2: "सुरक्षा को लेकर चिंतित हैं? चिंता न करें, हम केवल वित्त विशिष्ट शब्द सुनते हैं।",
        ambient_desc_3: "आप इस विकल्प को सेटिंग्स में कभी भी अक्षम कर सकते हैं।",
        enable: "सक्षम करें",
        skip: "छोड़ें",
        ambient_live: "एम्बिएंट रिकॉर्डिंग लाइव है",
        ambient_off: "एम्बिएंट रिकॉर्डिंग बंद है",
        allow_ambient_recording: "एम्बिएंट रिकॉर्डिंग की अनुमति दें",
    }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
    const [language, setLanguage] = useState<Language>("English");

    const t = (key: string) => {
        return translations[language][key as keyof typeof translations["English"]] || key;
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (!context) throw new Error("useLanguage must be used within LanguageProvider");
    return context;
};
