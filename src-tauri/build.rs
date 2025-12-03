fn main() {
    dotenv_build::output(dotenv_build::Config::default()).expect("Failed to load .env file");
    tauri_build::build()
}
