const fs = require('fs');
const path = 'c:/Users/rishi/Projects/Demo/web/components/LanguageContext.tsx';
let content = fs.readFileSync(path, 'utf8');

const newKeys = {
    English: 'application_preferences: "Application Preferences",',
    Hindi: 'application_preferences: "एप्लिकेशन प्राथमिकताएं",',
    Bengali: 'application_preferences: "অ্যাপ্লিকেশন পছন্দসমূহ",',
    Tamil: 'application_preferences: "பயன்பாட்டு விருப்பங்கள்",',
    Telugu: 'application_preferences: "అప్లికేషన్ ప్రాధాన్యతలు",',
    Gujarati: 'application_preferences: "એપ્લિકેશન પસંદગીઓ",',
    Kannada: 'application_preferences: "ಅಪ್ಲಿಕೇಶನ್ ಆದ್ಯತೆಗಳು",',
    Malayalam: 'application_preferences: "ആപ്ലിക്കേഷൻ മുൻഗണനകൾ",',
    Marathi: 'application_preferences: "अॅप प्राधान्ये",',
    Punjabi: 'application_preferences: "ਐਪਲੀਕੇਸ਼ਨ ਤਰਜੀਹਾਂ",',
    Odia: 'application_preferences: "ଆପ୍ଲିକେସନ୍ ପସନ୍ଦଗୁଡିକ",'
};

for (const lang of Object.keys(newKeys)) {
    const endBraceRegex = new RegExp('(' + lang + ':\\s*{[\\s\\S]*?)(view_analytics:\\s*"[^"]*")(\\s*[,}])');
    content = content.replace(endBraceRegex, `$1$2,\n${newKeys[lang]}\n$3`);
}

fs.writeFileSync(path, content, 'utf8');
