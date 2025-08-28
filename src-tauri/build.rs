use std::{env, fs, path::Path};

fn copy_dir(src: &Path, dest: &Path) -> std::io::Result<()> {
    if !dest.exists() {
        fs::create_dir_all(dest)?;
    }
    for entry in fs::read_dir(src)? {
        let entry = entry?;
        let file_type = entry.file_type()?;
        let dest_path = dest.join(entry.file_name());
        if file_type.is_dir() {
            copy_dir(&entry.path(), &dest_path)?;
        } else {
            fs::copy(entry.path(), dest_path)?;
        }
    }
    Ok(())
}

fn main() {
    // In dev mode copy the public/sfz_sounds directory so resolveResource can find it.
    if env::var("PROFILE").as_deref() == Ok("debug") {
        let manifest_dir = env::var("CARGO_MANIFEST_DIR").unwrap();
        let src = Path::new(&manifest_dir).join("../public/sfz_sounds");
        let dest = Path::new(&manifest_dir).join("target/debug/sfz_sounds");
        let _ = fs::remove_dir_all(&dest);
        if let Err(e) = copy_dir(&src, &dest) {
            println!("cargo:warning=failed to copy sfz_sounds: {e}");
        }
    }

    tauri_build::build()
}
