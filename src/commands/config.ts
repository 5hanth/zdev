import { loadConfig, saveConfig, CONFIG_PATH } from "../config.js";

export interface ConfigOptions {
  add?: string;
  remove?: string;
  list?: boolean;
  set?: string;
}

export async function configCmd(options: ConfigOptions = {}): Promise<void> {
  const config = loadConfig();
  
  if (options.set) {
    // Parse key=value
    const [key, ...valueParts] = options.set.split("=");
    const value = valueParts.join("=");
    
    if (!value) {
      console.error(`Usage: zdev config --set key=value`);
      console.log(`\nConfigurable keys:`);
      console.log(`   devDomain        Dev domain for public URLs`);
      console.log(`   dockerHostIp     Docker host IP for Traefik`);
      console.log(`   traefikConfigDir Traefik dynamic config directory`);
      return;
    }
    
    if (key === "devDomain") {
      config.devDomain = value;
      saveConfig(config);
      console.log(`✅ Set devDomain = ${value}`);
    } else if (key === "dockerHostIp") {
      config.dockerHostIp = value;
      saveConfig(config);
      console.log(`✅ Set dockerHostIp = ${value}`);
    } else if (key === "traefikConfigDir") {
      config.traefikConfigDir = value;
      saveConfig(config);
      console.log(`✅ Set traefikConfigDir = ${value}`);
    } else {
      console.error(`Unknown config key: ${key}`);
    }
    return;
  }
  
  if (options.list || (!options.add && !options.remove)) {
    console.log(`🐂 zdev Configuration\n`);
    console.log(`📁 Config file: ${CONFIG_PATH}`);
    
    console.log(`\n🌐 Traefik / Public URLs:`);
    console.log(`   Dev domain:     ${config.devDomain}`);
    console.log(`   Docker host IP: ${config.dockerHostIp}`);
    console.log(`   Config dir:     ${config.traefikConfigDir}`);
    
    console.log(`\n📋 Copy patterns (files auto-copied to worktrees):`);
    if (config.copyPatterns && config.copyPatterns.length > 0) {
      for (const pattern of config.copyPatterns) {
        console.log(`   - ${pattern}`);
      }
    } else {
      console.log(`   (none)`);
    }
    
    console.log(`\n🔌 Port allocation:`);
    console.log(`   Next frontend port: ${config.nextFrontendPort}`);
    console.log(`   Next Convex port: ${config.nextConvexPort}`);
    
    console.log(`\nCommands:`);
    console.log(`   zdev config --set devDomain=dev.example.com`);
    console.log(`   zdev config --add ".env.local"`);
    console.log(`   zdev config --remove ".env.local"`);
    return;
  }
  
  if (options.add) {
    if (!config.copyPatterns) {
      config.copyPatterns = [];
    }
    
    if (config.copyPatterns.includes(options.add)) {
      console.log(`Pattern "${options.add}" already exists`);
    } else {
      config.copyPatterns.push(options.add);
      saveConfig(config);
      console.log(`✅ Added copy pattern: ${options.add}`);
    }
    return;
  }
  
  if (options.remove) {
    if (!config.copyPatterns) {
      console.log(`Pattern "${options.remove}" not found`);
      return;
    }
    
    const index = config.copyPatterns.indexOf(options.remove);
    if (index === -1) {
      console.log(`Pattern "${options.remove}" not found`);
    } else {
      config.copyPatterns.splice(index, 1);
      saveConfig(config);
      console.log(`✅ Removed copy pattern: ${options.remove}`);
    }
    return;
  }
}
