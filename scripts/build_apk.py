import os
import sys
import subprocess
import zipfile
import shutil

sys.stdout.reconfigure(encoding='utf-8')

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ANDROID_DIR = os.path.join(ROOT, "android")
APP_DIR = os.path.join(ANDROID_DIR, "app")
SRC_DIR = os.path.join(APP_DIR, "src", "main")
RES_DIR = os.path.join(SRC_DIR, "res")
JAVA_FILE = os.path.join(SRC_DIR, "java", "org", "nvc", "volcre", "MainActivity.java")
ASSETS_DIR = os.path.join(SRC_DIR, "assets")
ASSETS_WWW = os.path.join(ASSETS_DIR, "www")
BUILD_DIR = os.path.join(ANDROID_DIR, "build")

# Paths to tools
SDK = os.environ.get("ANDROID_HOME") or os.environ.get("ANDROID_SDK_ROOT") or r"C:\Users\ASUS\AppData\Local\Android\Sdk"
JDK = os.environ.get("JAVA_HOME") or r"C:\Program Files\Microsoft\jdk-17.0.20.101-hotspot"
JDK_BIN = os.path.join(JDK, "bin")

AAPT2 = os.path.join(SDK, "build-tools", "35.0.0", "aapt2.exe")
D8 = os.path.join(SDK, "cmdline-tools", "latest", "bin", "d8.bat")
ZIPALIGN = os.path.join(SDK, "build-tools", "35.0.0", "zipalign.exe")
APKSIGNER = os.path.join(SDK, "build-tools", "35.0.0", "apksigner.bat")
ANDROID_JAR = os.path.join(SDK, "platforms", "android-35", "android.jar")
JAVAC = os.path.join(JDK_BIN, "javac.exe")
KEYTOOL = os.path.join(JDK_BIN, "keytool.exe")

compiled_res = os.path.join(BUILD_DIR, "compiled_res.zip")
unaligned_apk = os.path.join(BUILD_DIR, "unaligned.apk")
aligned_apk = os.path.join(BUILD_DIR, "aligned.apk")
final_apk = os.path.join(ROOT, "nvc-mobile.apk")
root_copy_apk = os.path.join(os.path.dirname(ROOT), "nvc-mobile.apk")
keystore = os.path.join(ANDROID_DIR, "nvc-mobile-debug.keystore")
classes_dir = os.path.join(BUILD_DIR, "classes")
dex_dir = os.path.join(BUILD_DIR, "dex")

os.makedirs(classes_dir, exist_ok=True)
os.makedirs(dex_dir, exist_ok=True)
os.makedirs(ASSETS_WWW, exist_ok=True)

import socket
def get_lan_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "192.168.1.17"

env_file = os.path.join(ROOT, ".env")
env_url = None
if os.path.exists(env_file):
    with open(env_file, "r", encoding="utf-8") as f:
        for line in f:
            if line.startswith("VOLCRE_API_BASE_URL="):
                val = line.split("=", 1)[1].strip()
                if val:
                    env_url = val
                break

target_url = os.environ.get("VOLCRE_API_BASE_URL") or env_url
if not target_url:
    lan_ip = os.environ.get("VOLCRE_LAN_IP") or get_lan_ip()
    target_url = f"http://{lan_ip}:8000"

target_url = target_url.rstrip("/")
os.environ["VOLCRE_API_BASE_URL"] = target_url
os.environ["VOLCRE_WEB_API_BASE_URL"] = target_url
print(f"Target backend URL: {target_url}")

print("Step 1: Building Vite production bundle...")
cmd = ["npx", "vite", "build"]
subprocess.run(cmd, cwd=ROOT, check=True, shell=True)

print("Step 2: Syncing bundle to Android assets...")
dist_dir = os.path.join(ROOT, "dist")
for item in os.listdir(dist_dir):
    s = os.path.join(dist_dir, item)
    d = os.path.join(ASSETS_WWW, item)
    if os.path.isdir(s):
        if os.path.exists(d):
            shutil.rmtree(d)
        shutil.copytree(s, d)
    else:
        shutil.copy2(s, d)

print("Step 3: Compiling resources with AAPT2...")
cmd = [AAPT2, "compile", "--dir", RES_DIR, "-o", compiled_res]
subprocess.run(cmd, check=True)

print("Step 4: Linking resources with AAPT2...")
gen_dir = os.path.join(BUILD_DIR, "gen")
os.makedirs(gen_dir, exist_ok=True)
manifest = os.path.join(SRC_DIR, "AndroidManifest.xml")
cmd = [
    AAPT2, "link",
    "-I", ANDROID_JAR,
    "--manifest", manifest,
    "-A", ASSETS_DIR,
    "-o", unaligned_apk,
    "--java", gen_dir,
    "--auto-add-overlay",
    compiled_res
]
subprocess.run(cmd, check=True)

print("Step 5: Compiling Java...")
r_java = os.path.join(gen_dir, "org", "nvc", "volcre", "R.java")
java_sources = [JAVA_FILE]
if os.path.exists(r_java):
    java_sources.append(r_java)

cmd = [
    JAVAC,
    "-cp", ANDROID_JAR,
    "-d", classes_dir,
    "-source", "1.8",
    "-target", "1.8"
] + java_sources
subprocess.run(cmd, check=True)

print("Step 6: Converting bytecode to DEX...")
class_files = []
for r, d, files in os.walk(classes_dir):
    for f in files:
        if f.endswith(".class"):
            class_files.append(os.path.join(r, f))

cmd = [
    D8,
    "--lib", ANDROID_JAR,
    "--output", dex_dir,
    "--min-api", "24"
] + class_files
subprocess.run(cmd, check=True, shell=True)

print("Step 7: Packaging classes.dex into APK...")
dex_file = os.path.join(dex_dir, "classes.dex")
with zipfile.ZipFile(unaligned_apk, "a") as z:
    z.write(dex_file, "classes.dex")

print("Step 8: Zipaligning APK...")
if os.path.exists(aligned_apk):
    os.remove(aligned_apk)
cmd = [ZIPALIGN, "-v", "-p", "4", unaligned_apk, aligned_apk]
subprocess.run(cmd, check=True)

if not os.path.exists(keystore):
    print("Step 9: Generating keystore...")
    cmd = [
        KEYTOOL, "-genkeypair", "-v",
        "-keystore", keystore,
        "-alias", "volcre",
        "-keyalg", "RSA",
        "-keysize", "2048",
        "-validity", "10000",
        "-storepass", "android",
        "-keypass", "android",
        "-dname", "CN=Volcre, OU=NVC, O=NVC, L=Bacolod, ST=Negros, C=PH"
    ]
    subprocess.run(cmd, check=True)

print("Step 10: Signing APK with APKSIGNER...")
if os.path.exists(final_apk):
    os.remove(final_apk)

cmd = [
    APKSIGNER, "sign",
    "--ks", keystore,
    "--ks-pass", "pass:android",
    "--key-pass", "pass:android",
    "--ks-key-alias", "volcre",
    "--out", final_apk,
    aligned_apk
]
subprocess.run(cmd, check=True, shell=True)

print("Step 11: Verifying signature...")
cmd = [APKSIGNER, "verify", "--verbose", final_apk]
subprocess.run(cmd, check=True, shell=True)

shutil.copy2(final_apk, root_copy_apk)
# Also copy to legacy volcre-mobile.apk names
shutil.copy2(final_apk, os.path.join(ROOT, "volcre-mobile.apk"))
shutil.copy2(final_apk, os.path.join(os.path.dirname(ROOT), "volcre-mobile.apk"))
size_mb = os.path.getsize(final_apk) / (1024 * 1024)

print(f"\n==========================================")
print(f" BUILD SUCCESSFUL!")
print(f" Output APK: {final_apk}")
print(f" Root Copy:  {root_copy_apk}")
print(f" File Size:  {size_mb:.2f} MB")
print(f"==========================================")
