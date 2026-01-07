/**
 * Simple AES-GCM Client-side Encryption for the Vault.
 * Ensures the server never sees the plaintext data.
 */

async function getEncryptionKey(password: string, salt: Uint8Array) {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        "raw",
        enc.encode(password),
        { name: "PBKDF2" },
        false,
        ["deriveBits", "deriveKey"]
    );
    return crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: salt.buffer as ArrayBuffer,
            iterations: 100000,
            hash: "SHA-256",
        },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt"]
    );
}

export async function encryptData(text: string, password: string) {
    const enc = new TextEncoder();
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await getEncryptionKey(password, salt);

    const encrypted = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv.buffer as ArrayBuffer },
        key,
        enc.encode(text)
    );

    return {
        encryptedData: bufferToBase64(encrypted),
        salt: bufferToBase64(salt),
        iv: bufferToBase64(iv),
    };
}

export async function decryptData(encryptedDataB64: string, password: string, saltB64: string, ivB64: string) {
    const salt = base64ToBuffer(saltB64);
    const iv = base64ToBuffer(ivB64);
    const data = base64ToBuffer(encryptedDataB64);

    const key = await getEncryptionKey(password, salt);
    const decrypted = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: iv.buffer as ArrayBuffer },
        key,
        data.buffer as ArrayBuffer
    );

    return new TextDecoder().decode(decrypted);
}

// Robust Helper Functions for Base64
function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

function base64ToBuffer(base64: string): Uint8Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}
