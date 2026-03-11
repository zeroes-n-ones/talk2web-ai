// Talk2Web AI Chrome Extension - CSP Compliant
// Full popup functionality with proper event handling

console.log("POPUP SCRIPT RUNNING");

// Global variables
let recognition = null;
let synthesis = window.speechSynthesis;
let isListening = false;
let isProcessing = false;
let articleContent = '';
let userQuery = '';
let aiResponse = '';
let conversationHistory = [];

// Safe DOM initialization pattern
function startPopup() {
    console.log("Popup initialization started");
    initPopup();
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startPopup);
} else {
    startPopup();
}

function initPopup() {
    console.log("DOM READY");
    
    // Debug border - keep temporarily for debugging
    document.body.style.border = "3px solid red";
    
    try {
        // Attach event listeners
        const extractBtn = document.getElementById("extractBtn");
        const voiceBtn = document.getElementById("voiceBtn");
        const sendBtn = document.getElementById("sendBtn");
        const queryInput = document.getElementById("queryInput");
        const voiceStatus = document.getElementById("voiceStatus");

        console.log("extractBtn:", extractBtn);
        console.log("voiceBtn:", voiceBtn);
        console.log("sendBtn:", sendBtn);
        console.log("queryInput:", queryInput);
        console.log("voiceStatus:", voiceStatus);

        if (extractBtn) {
            extractBtn.addEventListener("click", extractArticle);
            console.log("Extract button event listener attached");
        } else {
            console.error("Extract button not found");
        }

        // Mic orb event listener
        const micOrb = document.getElementById("micOrb");
        if (micOrb) {
            micOrb.addEventListener("click", toggleVoice);
            console.log("Mic orb event listener attached");
        } else {
            console.error("Mic orb not found");
        }

        if (sendBtn) {
            sendBtn.addEventListener("click", sendQuery);
            console.log("Send button event listener attached");
        } else {
            console.error("Send button not found");
        }

        if (queryInput) {
            queryInput.addEventListener("input", function(e) {
                userQuery = e.target.value;
            });
            console.log("Query input event listener attached");
        } else {
            console.error("Query input not found");
        }

        // Voice recognition moved to content script
        console.log("Voice recognition moved to content script");
        
        // Check Chrome APIs
        console.log("Chrome APIs:", typeof chrome);
        console.log("Tabs API:", chrome?.tabs);
        console.log("Scripting API:", chrome?.scripting);
        
        if (typeof chrome !== 'undefined' && chrome.tabs && chrome.scripting) {
            console.log("Chrome APIs available");
        } else {
            console.warn("Chrome APIs not available");
        }
        
        console.log("Popup initialization complete - buttons should work now");
    } catch (error) {
        console.error("Popup initialization failed:", error);
    }
}

function updateVoiceButton() {
    const micOrb = document.getElementById("micOrb");
    if (micOrb) {
        // Mic orb styling is handled by CSS classes, no text changes needed
        console.log("Mic orb state updated");
    }
}

function toggleVoice() {
    console.log("Voice button clicked");
    
    const micOrb = document.getElementById("micOrb");
    
    if (isListening) {
        // Stop listening
        isListening = false;
        micOrb.classList.remove("listening");
        showSuccess("Voice recognition stopped");
    } else {
        // Start listening using content script
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs && tabs[0]) {
                chrome.scripting.executeScript({
                    target: { tabId: tabs[0].id },
                    func: () => {
                        // This function runs in the content script context
                        if (window.startVoiceRecognition) {
                            window.startVoiceRecognition();
                        }
                    }
                });
                
                isListening = true;
                micOrb.classList.add("listening");
                showSuccess("🎤 Microphone is active. Speak now!");
            }
        });
    }
}

// Safe content extraction function for executeScript
function extractPageContent() {
    const hostname = location.hostname || "";
    const title = document.title || "";

    let element =
        document.querySelector("article") ||
        document.querySelector("main") ||
        document.querySelector("[role='main']") ||
        document.body;

    let content = element.innerText || "";

    content = content.replace(/\s+/g, " ").trim();

    return {
        hostname: hostname,
        title: title,
        content: content.substring(0, 15000),
        wordCount: content.split(" ").length
    };
}

function extractArticle() {
    console.log("Extract button clicked");
    console.log("Running extraction");
    
    if (typeof chrome === 'undefined' || !chrome.tabs || !chrome.scripting) {
        showError("Chrome APIs not available. Make sure extension is loaded properly.");
        return;
    }
    
    isProcessing = true;
    const extractBtn = document.getElementById("extractBtn");
    const articleStatus = document.getElementById("articleStatus");
    
    if (extractBtn) {
        extractBtn.disabled = true;
        extractBtn.textContent = "Extracting...";
    }
    if (articleStatus) {
        articleStatus.textContent = "Extracting content from page...";
    }
    
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        console.log("Tabs query result:", tabs);
        
        if (tabs && tabs[0]) {
            chrome.scripting.executeScript({
                target: { tabId: tabs[0].id },
                func: extractPageContent
            }, (result) => {
                console.log("Content script result:", result);
                
                isProcessing = false;
                if (extractBtn) {
                    extractBtn.disabled = false;
                    extractBtn.textContent = "Extract Article";
                }
                
                if (result && result[0] && result[0].result) {
                    const data = result[0].result;
                    console.log("Extraction data:", data);
                    
                    articleContent = data.content;
                    
                    if (articleStatus) {
                        articleStatus.innerHTML = 
                            "Source: " + data.hostname + "<br>" +
                            "Title: " + data.title + "<br>" +
                            "Words extracted: " + data.wordCount;
                    }
                    
                    if (data.content && data.content.length > 0) {
                        showSuccess("Article extracted successfully!");
                    } else {
                        showError("No content could be extracted from this page");
                    }
                } else {
                    if (articleStatus) {
                        articleStatus.textContent = "❌ Could not extract content from this page";
                    }
                    articleContent = '';
                    showError("Failed to extract content");
                }
            });
        } else {
            console.error("No active tab found");
            isProcessing = false;
            if (extractBtn) {
                extractBtn.disabled = false;
                extractBtn.textContent = "Extract Article";
            }
            showError("No active tab found");
        }
    });
}

async function sendQuery() {
    console.log("Ask AI button clicked");
    
    const query = document.getElementById("queryInput").value;
    if (!query || !query.trim()) {
        showError("Please enter a question");
        return;
    }
    
    if (!articleContent) {
        showError("Please extract article content first");
        return;
    }
    
    const responseDiv = document.getElementById("response");
    if (responseDiv) {
        responseDiv.style.display = "block";
        responseDiv.innerHTML = "Processing...";
    }
    
    try {
        console.log("Sending query to backend API: /api/v1/query");
        
        const response = await fetch("http://localhost:8000/api/v1/query", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                article_text: articleContent,
                query: query,
                language: "auto"
            })
        });
        
        console.log("Backend response status:", response.status);
        
        const result = await response.json();
        console.log("Backend response:", result);
        
        if (result.success) {
            aiResponse = result.response_text;
            
            if (responseDiv) {
                responseDiv.innerHTML = "<strong>AI Response:</strong><br>" + result.response_text;
                
                if (synthesis) {
                    // Create speak button programmatically (CSP compliant)
                    const speakButton = document.createElement("button");
                    speakButton.className = "btn";
                    speakButton.textContent = "🔊 Speak";
                    speakButton.addEventListener("click", speakResponse);
                    responseDiv.appendChild(document.createElement("br"));
                    responseDiv.appendChild(document.createElement("br"));
                    responseDiv.appendChild(speakButton);
                }
            }
            
            // Update conversation history locally
            conversationHistory = conversationHistory.concat([
                { role: "user", content: query },
                { role: "assistant", content: result.response_text }
            ]).slice(-10);
            
            showSuccess("Query processed successfully!");
        } else {
            if (responseDiv) {
                responseDiv.innerHTML = "Error: " + (result.error || "Unknown error");
            }
        }
    } catch (error) {
        console.error("Error sending query:", error);
        if (responseDiv) {
            responseDiv.innerHTML = "Error: Could not connect to backend. Please make sure the server is running on localhost:8000";
        }
        showError("Backend connection failed");
    }
}

function speakResponse() {
    if (!synthesis || !aiResponse) return;
    
    try {
        synthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(aiResponse);
        utterance.rate = 1;
        utterance.pitch = 1;
        utterance.volume = 1;
        synthesis.speak(utterance);
    } catch (error) {
        console.error("Error speaking:", error);
    }
}

function showError(message) {
    const errorDiv = document.createElement("div");
    errorDiv.className = "error-message";
    errorDiv.textContent = message;
    document.body.insertBefore(errorDiv, document.body.firstChild);
    
    setTimeout(function() {
        if (errorDiv.parentNode) {
            errorDiv.parentNode.removeChild(errorDiv);
        }
    }, 3000);
}

function showSuccess(message) {
    const successDiv = document.createElement("div");
    successDiv.className = "success-message";
    successDiv.textContent = message;
    document.body.insertBefore(successDiv, document.body.firstChild);
    
    setTimeout(function() {
        if (successDiv.parentNode) {
            successDiv.parentNode.removeChild(successDiv);
        }
    }, 3000);
}

// Listen for voice recognition results from content script
chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "voiceResult") {
        // Stop listening state
        isListening = false;
        
        // Set the query input
        const queryInput = document.getElementById("queryInput");
        if (queryInput) {
            queryInput.value = msg.text;
            showSuccess("✅ Voice recognized: " + msg.text);
        }
        
        // Update mic orb state
        const micOrb = document.getElementById("micOrb");
        micOrb.classList.remove("listening");
        micOrb.classList.add("processing");

        setTimeout(() => {
            micOrb.classList.remove("processing");
        }, 1500);
    } else if (msg.type === "voiceError") {
        // Stop listening state
        isListening = false;
        
        // Update mic orb state
        const micOrb = document.getElementById("micOrb");
        micOrb.classList.remove("listening");
        
        // Show error
        showError("🎤 Voice error: " + msg.error);
    }
});

console.log("Talk2Web AI Popup script loaded successfully");
