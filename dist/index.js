#!/usr/bin/env bun
// @bun
import { createRequire } from "node:module";
var __create = Object.create;
var __getProtoOf = Object.getPrototypeOf;
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __toESM = (mod, isNodeMode, target) => {
  target = mod != null ? __create(__getProtoOf(mod)) : {};
  const to = isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target;
  for (let key of __getOwnPropNames(mod))
    if (!__hasOwnProp.call(to, key))
      __defProp(to, key, {
        get: () => mod[key],
        enumerable: true
      });
  return to;
};
var __commonJS = (cb, mod) => () => (mod || cb((mod = { exports: {} }).exports, mod), mod.exports);
var __require = /* @__PURE__ */ createRequire(import.meta.url);

// node_modules/commander/lib/error.js
var require_error = __commonJS((exports) => {
  class CommanderError extends Error {
    constructor(exitCode, code, message) {
      super(message);
      Error.captureStackTrace(this, this.constructor);
      this.name = this.constructor.name;
      this.code = code;
      this.exitCode = exitCode;
      this.nestedError = undefined;
    }
  }

  class InvalidArgumentError extends CommanderError {
    constructor(message) {
      super(1, "commander.invalidArgument", message);
      Error.captureStackTrace(this, this.constructor);
      this.name = this.constructor.name;
    }
  }
  exports.CommanderError = CommanderError;
  exports.InvalidArgumentError = InvalidArgumentError;
});

// node_modules/commander/lib/argument.js
var require_argument = __commonJS((exports) => {
  var { InvalidArgumentError } = require_error();

  class Argument {
    constructor(name, description) {
      this.description = description || "";
      this.variadic = false;
      this.parseArg = undefined;
      this.defaultValue = undefined;
      this.defaultValueDescription = undefined;
      this.argChoices = undefined;
      switch (name[0]) {
        case "<":
          this.required = true;
          this._name = name.slice(1, -1);
          break;
        case "[":
          this.required = false;
          this._name = name.slice(1, -1);
          break;
        default:
          this.required = true;
          this._name = name;
          break;
      }
      if (this._name.length > 3 && this._name.slice(-3) === "...") {
        this.variadic = true;
        this._name = this._name.slice(0, -3);
      }
    }
    name() {
      return this._name;
    }
    _concatValue(value, previous) {
      if (previous === this.defaultValue || !Array.isArray(previous)) {
        return [value];
      }
      return previous.concat(value);
    }
    default(value, description) {
      this.defaultValue = value;
      this.defaultValueDescription = description;
      return this;
    }
    argParser(fn) {
      this.parseArg = fn;
      return this;
    }
    choices(values) {
      this.argChoices = values.slice();
      this.parseArg = (arg, previous) => {
        if (!this.argChoices.includes(arg)) {
          throw new InvalidArgumentError(`Allowed choices are ${this.argChoices.join(", ")}.`);
        }
        if (this.variadic) {
          return this._concatValue(arg, previous);
        }
        return arg;
      };
      return this;
    }
    argRequired() {
      this.required = true;
      return this;
    }
    argOptional() {
      this.required = false;
      return this;
    }
  }
  function humanReadableArgName(arg) {
    const nameOutput = arg.name() + (arg.variadic === true ? "..." : "");
    return arg.required ? "<" + nameOutput + ">" : "[" + nameOutput + "]";
  }
  exports.Argument = Argument;
  exports.humanReadableArgName = humanReadableArgName;
});

// node_modules/commander/lib/help.js
var require_help = __commonJS((exports) => {
  var { humanReadableArgName } = require_argument();

  class Help {
    constructor() {
      this.helpWidth = undefined;
      this.sortSubcommands = false;
      this.sortOptions = false;
      this.showGlobalOptions = false;
    }
    visibleCommands(cmd) {
      const visibleCommands = cmd.commands.filter((cmd2) => !cmd2._hidden);
      const helpCommand = cmd._getHelpCommand();
      if (helpCommand && !helpCommand._hidden) {
        visibleCommands.push(helpCommand);
      }
      if (this.sortSubcommands) {
        visibleCommands.sort((a, b) => {
          return a.name().localeCompare(b.name());
        });
      }
      return visibleCommands;
    }
    compareOptions(a, b) {
      const getSortKey = (option) => {
        return option.short ? option.short.replace(/^-/, "") : option.long.replace(/^--/, "");
      };
      return getSortKey(a).localeCompare(getSortKey(b));
    }
    visibleOptions(cmd) {
      const visibleOptions = cmd.options.filter((option) => !option.hidden);
      const helpOption = cmd._getHelpOption();
      if (helpOption && !helpOption.hidden) {
        const removeShort = helpOption.short && cmd._findOption(helpOption.short);
        const removeLong = helpOption.long && cmd._findOption(helpOption.long);
        if (!removeShort && !removeLong) {
          visibleOptions.push(helpOption);
        } else if (helpOption.long && !removeLong) {
          visibleOptions.push(cmd.createOption(helpOption.long, helpOption.description));
        } else if (helpOption.short && !removeShort) {
          visibleOptions.push(cmd.createOption(helpOption.short, helpOption.description));
        }
      }
      if (this.sortOptions) {
        visibleOptions.sort(this.compareOptions);
      }
      return visibleOptions;
    }
    visibleGlobalOptions(cmd) {
      if (!this.showGlobalOptions)
        return [];
      const globalOptions = [];
      for (let ancestorCmd = cmd.parent;ancestorCmd; ancestorCmd = ancestorCmd.parent) {
        const visibleOptions = ancestorCmd.options.filter((option) => !option.hidden);
        globalOptions.push(...visibleOptions);
      }
      if (this.sortOptions) {
        globalOptions.sort(this.compareOptions);
      }
      return globalOptions;
    }
    visibleArguments(cmd) {
      if (cmd._argsDescription) {
        cmd.registeredArguments.forEach((argument) => {
          argument.description = argument.description || cmd._argsDescription[argument.name()] || "";
        });
      }
      if (cmd.registeredArguments.find((argument) => argument.description)) {
        return cmd.registeredArguments;
      }
      return [];
    }
    subcommandTerm(cmd) {
      const args = cmd.registeredArguments.map((arg) => humanReadableArgName(arg)).join(" ");
      return cmd._name + (cmd._aliases[0] ? "|" + cmd._aliases[0] : "") + (cmd.options.length ? " [options]" : "") + (args ? " " + args : "");
    }
    optionTerm(option) {
      return option.flags;
    }
    argumentTerm(argument) {
      return argument.name();
    }
    longestSubcommandTermLength(cmd, helper) {
      return helper.visibleCommands(cmd).reduce((max, command) => {
        return Math.max(max, helper.subcommandTerm(command).length);
      }, 0);
    }
    longestOptionTermLength(cmd, helper) {
      return helper.visibleOptions(cmd).reduce((max, option) => {
        return Math.max(max, helper.optionTerm(option).length);
      }, 0);
    }
    longestGlobalOptionTermLength(cmd, helper) {
      return helper.visibleGlobalOptions(cmd).reduce((max, option) => {
        return Math.max(max, helper.optionTerm(option).length);
      }, 0);
    }
    longestArgumentTermLength(cmd, helper) {
      return helper.visibleArguments(cmd).reduce((max, argument) => {
        return Math.max(max, helper.argumentTerm(argument).length);
      }, 0);
    }
    commandUsage(cmd) {
      let cmdName = cmd._name;
      if (cmd._aliases[0]) {
        cmdName = cmdName + "|" + cmd._aliases[0];
      }
      let ancestorCmdNames = "";
      for (let ancestorCmd = cmd.parent;ancestorCmd; ancestorCmd = ancestorCmd.parent) {
        ancestorCmdNames = ancestorCmd.name() + " " + ancestorCmdNames;
      }
      return ancestorCmdNames + cmdName + " " + cmd.usage();
    }
    commandDescription(cmd) {
      return cmd.description();
    }
    subcommandDescription(cmd) {
      return cmd.summary() || cmd.description();
    }
    optionDescription(option) {
      const extraInfo = [];
      if (option.argChoices) {
        extraInfo.push(`choices: ${option.argChoices.map((choice) => JSON.stringify(choice)).join(", ")}`);
      }
      if (option.defaultValue !== undefined) {
        const showDefault = option.required || option.optional || option.isBoolean() && typeof option.defaultValue === "boolean";
        if (showDefault) {
          extraInfo.push(`default: ${option.defaultValueDescription || JSON.stringify(option.defaultValue)}`);
        }
      }
      if (option.presetArg !== undefined && option.optional) {
        extraInfo.push(`preset: ${JSON.stringify(option.presetArg)}`);
      }
      if (option.envVar !== undefined) {
        extraInfo.push(`env: ${option.envVar}`);
      }
      if (extraInfo.length > 0) {
        return `${option.description} (${extraInfo.join(", ")})`;
      }
      return option.description;
    }
    argumentDescription(argument) {
      const extraInfo = [];
      if (argument.argChoices) {
        extraInfo.push(`choices: ${argument.argChoices.map((choice) => JSON.stringify(choice)).join(", ")}`);
      }
      if (argument.defaultValue !== undefined) {
        extraInfo.push(`default: ${argument.defaultValueDescription || JSON.stringify(argument.defaultValue)}`);
      }
      if (extraInfo.length > 0) {
        const extraDescripton = `(${extraInfo.join(", ")})`;
        if (argument.description) {
          return `${argument.description} ${extraDescripton}`;
        }
        return extraDescripton;
      }
      return argument.description;
    }
    formatHelp(cmd, helper) {
      const termWidth = helper.padWidth(cmd, helper);
      const helpWidth = helper.helpWidth || 80;
      const itemIndentWidth = 2;
      const itemSeparatorWidth = 2;
      function formatItem(term, description) {
        if (description) {
          const fullText = `${term.padEnd(termWidth + itemSeparatorWidth)}${description}`;
          return helper.wrap(fullText, helpWidth - itemIndentWidth, termWidth + itemSeparatorWidth);
        }
        return term;
      }
      function formatList(textArray) {
        return textArray.join(`
`).replace(/^/gm, " ".repeat(itemIndentWidth));
      }
      let output = [`Usage: ${helper.commandUsage(cmd)}`, ""];
      const commandDescription = helper.commandDescription(cmd);
      if (commandDescription.length > 0) {
        output = output.concat([
          helper.wrap(commandDescription, helpWidth, 0),
          ""
        ]);
      }
      const argumentList = helper.visibleArguments(cmd).map((argument) => {
        return formatItem(helper.argumentTerm(argument), helper.argumentDescription(argument));
      });
      if (argumentList.length > 0) {
        output = output.concat(["Arguments:", formatList(argumentList), ""]);
      }
      const optionList = helper.visibleOptions(cmd).map((option) => {
        return formatItem(helper.optionTerm(option), helper.optionDescription(option));
      });
      if (optionList.length > 0) {
        output = output.concat(["Options:", formatList(optionList), ""]);
      }
      if (this.showGlobalOptions) {
        const globalOptionList = helper.visibleGlobalOptions(cmd).map((option) => {
          return formatItem(helper.optionTerm(option), helper.optionDescription(option));
        });
        if (globalOptionList.length > 0) {
          output = output.concat([
            "Global Options:",
            formatList(globalOptionList),
            ""
          ]);
        }
      }
      const commandList = helper.visibleCommands(cmd).map((cmd2) => {
        return formatItem(helper.subcommandTerm(cmd2), helper.subcommandDescription(cmd2));
      });
      if (commandList.length > 0) {
        output = output.concat(["Commands:", formatList(commandList), ""]);
      }
      return output.join(`
`);
    }
    padWidth(cmd, helper) {
      return Math.max(helper.longestOptionTermLength(cmd, helper), helper.longestGlobalOptionTermLength(cmd, helper), helper.longestSubcommandTermLength(cmd, helper), helper.longestArgumentTermLength(cmd, helper));
    }
    wrap(str, width, indent, minColumnWidth = 40) {
      const indents = " \\f\\t\\v   -   　\uFEFF";
      const manualIndent = new RegExp(`[\\n][${indents}]+`);
      if (str.match(manualIndent))
        return str;
      const columnWidth = width - indent;
      if (columnWidth < minColumnWidth)
        return str;
      const leadingStr = str.slice(0, indent);
      const columnText = str.slice(indent).replace(`\r
`, `
`);
      const indentString = " ".repeat(indent);
      const zeroWidthSpace = "​";
      const breaks = `\\s${zeroWidthSpace}`;
      const regex = new RegExp(`
|.{1,${columnWidth - 1}}([${breaks}]|$)|[^${breaks}]+?([${breaks}]|$)`, "g");
      const lines = columnText.match(regex) || [];
      return leadingStr + lines.map((line, i) => {
        if (line === `
`)
          return "";
        return (i > 0 ? indentString : "") + line.trimEnd();
      }).join(`
`);
    }
  }
  exports.Help = Help;
});

// node_modules/commander/lib/option.js
var require_option = __commonJS((exports) => {
  var { InvalidArgumentError } = require_error();

  class Option {
    constructor(flags, description) {
      this.flags = flags;
      this.description = description || "";
      this.required = flags.includes("<");
      this.optional = flags.includes("[");
      this.variadic = /\w\.\.\.[>\]]$/.test(flags);
      this.mandatory = false;
      const optionFlags = splitOptionFlags(flags);
      this.short = optionFlags.shortFlag;
      this.long = optionFlags.longFlag;
      this.negate = false;
      if (this.long) {
        this.negate = this.long.startsWith("--no-");
      }
      this.defaultValue = undefined;
      this.defaultValueDescription = undefined;
      this.presetArg = undefined;
      this.envVar = undefined;
      this.parseArg = undefined;
      this.hidden = false;
      this.argChoices = undefined;
      this.conflictsWith = [];
      this.implied = undefined;
    }
    default(value, description) {
      this.defaultValue = value;
      this.defaultValueDescription = description;
      return this;
    }
    preset(arg) {
      this.presetArg = arg;
      return this;
    }
    conflicts(names) {
      this.conflictsWith = this.conflictsWith.concat(names);
      return this;
    }
    implies(impliedOptionValues) {
      let newImplied = impliedOptionValues;
      if (typeof impliedOptionValues === "string") {
        newImplied = { [impliedOptionValues]: true };
      }
      this.implied = Object.assign(this.implied || {}, newImplied);
      return this;
    }
    env(name) {
      this.envVar = name;
      return this;
    }
    argParser(fn) {
      this.parseArg = fn;
      return this;
    }
    makeOptionMandatory(mandatory = true) {
      this.mandatory = !!mandatory;
      return this;
    }
    hideHelp(hide = true) {
      this.hidden = !!hide;
      return this;
    }
    _concatValue(value, previous) {
      if (previous === this.defaultValue || !Array.isArray(previous)) {
        return [value];
      }
      return previous.concat(value);
    }
    choices(values) {
      this.argChoices = values.slice();
      this.parseArg = (arg, previous) => {
        if (!this.argChoices.includes(arg)) {
          throw new InvalidArgumentError(`Allowed choices are ${this.argChoices.join(", ")}.`);
        }
        if (this.variadic) {
          return this._concatValue(arg, previous);
        }
        return arg;
      };
      return this;
    }
    name() {
      if (this.long) {
        return this.long.replace(/^--/, "");
      }
      return this.short.replace(/^-/, "");
    }
    attributeName() {
      return camelcase(this.name().replace(/^no-/, ""));
    }
    is(arg) {
      return this.short === arg || this.long === arg;
    }
    isBoolean() {
      return !this.required && !this.optional && !this.negate;
    }
  }

  class DualOptions {
    constructor(options) {
      this.positiveOptions = new Map;
      this.negativeOptions = new Map;
      this.dualOptions = new Set;
      options.forEach((option) => {
        if (option.negate) {
          this.negativeOptions.set(option.attributeName(), option);
        } else {
          this.positiveOptions.set(option.attributeName(), option);
        }
      });
      this.negativeOptions.forEach((value, key) => {
        if (this.positiveOptions.has(key)) {
          this.dualOptions.add(key);
        }
      });
    }
    valueFromOption(value, option) {
      const optionKey = option.attributeName();
      if (!this.dualOptions.has(optionKey))
        return true;
      const preset = this.negativeOptions.get(optionKey).presetArg;
      const negativeValue = preset !== undefined ? preset : false;
      return option.negate === (negativeValue === value);
    }
  }
  function camelcase(str) {
    return str.split("-").reduce((str2, word) => {
      return str2 + word[0].toUpperCase() + word.slice(1);
    });
  }
  function splitOptionFlags(flags) {
    let shortFlag;
    let longFlag;
    const flagParts = flags.split(/[ |,]+/);
    if (flagParts.length > 1 && !/^[[<]/.test(flagParts[1]))
      shortFlag = flagParts.shift();
    longFlag = flagParts.shift();
    if (!shortFlag && /^-[^-]$/.test(longFlag)) {
      shortFlag = longFlag;
      longFlag = undefined;
    }
    return { shortFlag, longFlag };
  }
  exports.Option = Option;
  exports.DualOptions = DualOptions;
});

// node_modules/commander/lib/suggestSimilar.js
var require_suggestSimilar = __commonJS((exports) => {
  var maxDistance = 3;
  function editDistance(a, b) {
    if (Math.abs(a.length - b.length) > maxDistance)
      return Math.max(a.length, b.length);
    const d = [];
    for (let i = 0;i <= a.length; i++) {
      d[i] = [i];
    }
    for (let j = 0;j <= b.length; j++) {
      d[0][j] = j;
    }
    for (let j = 1;j <= b.length; j++) {
      for (let i = 1;i <= a.length; i++) {
        let cost = 1;
        if (a[i - 1] === b[j - 1]) {
          cost = 0;
        } else {
          cost = 1;
        }
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
        if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
          d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
        }
      }
    }
    return d[a.length][b.length];
  }
  function suggestSimilar(word, candidates) {
    if (!candidates || candidates.length === 0)
      return "";
    candidates = Array.from(new Set(candidates));
    const searchingOptions = word.startsWith("--");
    if (searchingOptions) {
      word = word.slice(2);
      candidates = candidates.map((candidate) => candidate.slice(2));
    }
    let similar = [];
    let bestDistance = maxDistance;
    const minSimilarity = 0.4;
    candidates.forEach((candidate) => {
      if (candidate.length <= 1)
        return;
      const distance = editDistance(word, candidate);
      const length = Math.max(word.length, candidate.length);
      const similarity = (length - distance) / length;
      if (similarity > minSimilarity) {
        if (distance < bestDistance) {
          bestDistance = distance;
          similar = [candidate];
        } else if (distance === bestDistance) {
          similar.push(candidate);
        }
      }
    });
    similar.sort((a, b) => a.localeCompare(b));
    if (searchingOptions) {
      similar = similar.map((candidate) => `--${candidate}`);
    }
    if (similar.length > 1) {
      return `
(Did you mean one of ${similar.join(", ")}?)`;
    }
    if (similar.length === 1) {
      return `
(Did you mean ${similar[0]}?)`;
    }
    return "";
  }
  exports.suggestSimilar = suggestSimilar;
});

// node_modules/commander/lib/command.js
var require_command = __commonJS((exports) => {
  var EventEmitter = __require("node:events").EventEmitter;
  var childProcess = __require("node:child_process");
  var path = __require("node:path");
  var fs = __require("node:fs");
  var process2 = __require("node:process");
  var { Argument, humanReadableArgName } = require_argument();
  var { CommanderError } = require_error();
  var { Help } = require_help();
  var { Option, DualOptions } = require_option();
  var { suggestSimilar } = require_suggestSimilar();

  class Command extends EventEmitter {
    constructor(name) {
      super();
      this.commands = [];
      this.options = [];
      this.parent = null;
      this._allowUnknownOption = false;
      this._allowExcessArguments = true;
      this.registeredArguments = [];
      this._args = this.registeredArguments;
      this.args = [];
      this.rawArgs = [];
      this.processedArgs = [];
      this._scriptPath = null;
      this._name = name || "";
      this._optionValues = {};
      this._optionValueSources = {};
      this._storeOptionsAsProperties = false;
      this._actionHandler = null;
      this._executableHandler = false;
      this._executableFile = null;
      this._executableDir = null;
      this._defaultCommandName = null;
      this._exitCallback = null;
      this._aliases = [];
      this._combineFlagAndOptionalValue = true;
      this._description = "";
      this._summary = "";
      this._argsDescription = undefined;
      this._enablePositionalOptions = false;
      this._passThroughOptions = false;
      this._lifeCycleHooks = {};
      this._showHelpAfterError = false;
      this._showSuggestionAfterError = true;
      this._outputConfiguration = {
        writeOut: (str) => process2.stdout.write(str),
        writeErr: (str) => process2.stderr.write(str),
        getOutHelpWidth: () => process2.stdout.isTTY ? process2.stdout.columns : undefined,
        getErrHelpWidth: () => process2.stderr.isTTY ? process2.stderr.columns : undefined,
        outputError: (str, write) => write(str)
      };
      this._hidden = false;
      this._helpOption = undefined;
      this._addImplicitHelpCommand = undefined;
      this._helpCommand = undefined;
      this._helpConfiguration = {};
    }
    copyInheritedSettings(sourceCommand) {
      this._outputConfiguration = sourceCommand._outputConfiguration;
      this._helpOption = sourceCommand._helpOption;
      this._helpCommand = sourceCommand._helpCommand;
      this._helpConfiguration = sourceCommand._helpConfiguration;
      this._exitCallback = sourceCommand._exitCallback;
      this._storeOptionsAsProperties = sourceCommand._storeOptionsAsProperties;
      this._combineFlagAndOptionalValue = sourceCommand._combineFlagAndOptionalValue;
      this._allowExcessArguments = sourceCommand._allowExcessArguments;
      this._enablePositionalOptions = sourceCommand._enablePositionalOptions;
      this._showHelpAfterError = sourceCommand._showHelpAfterError;
      this._showSuggestionAfterError = sourceCommand._showSuggestionAfterError;
      return this;
    }
    _getCommandAndAncestors() {
      const result = [];
      for (let command = this;command; command = command.parent) {
        result.push(command);
      }
      return result;
    }
    command(nameAndArgs, actionOptsOrExecDesc, execOpts) {
      let desc = actionOptsOrExecDesc;
      let opts = execOpts;
      if (typeof desc === "object" && desc !== null) {
        opts = desc;
        desc = null;
      }
      opts = opts || {};
      const [, name, args] = nameAndArgs.match(/([^ ]+) *(.*)/);
      const cmd = this.createCommand(name);
      if (desc) {
        cmd.description(desc);
        cmd._executableHandler = true;
      }
      if (opts.isDefault)
        this._defaultCommandName = cmd._name;
      cmd._hidden = !!(opts.noHelp || opts.hidden);
      cmd._executableFile = opts.executableFile || null;
      if (args)
        cmd.arguments(args);
      this._registerCommand(cmd);
      cmd.parent = this;
      cmd.copyInheritedSettings(this);
      if (desc)
        return this;
      return cmd;
    }
    createCommand(name) {
      return new Command(name);
    }
    createHelp() {
      return Object.assign(new Help, this.configureHelp());
    }
    configureHelp(configuration) {
      if (configuration === undefined)
        return this._helpConfiguration;
      this._helpConfiguration = configuration;
      return this;
    }
    configureOutput(configuration) {
      if (configuration === undefined)
        return this._outputConfiguration;
      Object.assign(this._outputConfiguration, configuration);
      return this;
    }
    showHelpAfterError(displayHelp = true) {
      if (typeof displayHelp !== "string")
        displayHelp = !!displayHelp;
      this._showHelpAfterError = displayHelp;
      return this;
    }
    showSuggestionAfterError(displaySuggestion = true) {
      this._showSuggestionAfterError = !!displaySuggestion;
      return this;
    }
    addCommand(cmd, opts) {
      if (!cmd._name) {
        throw new Error(`Command passed to .addCommand() must have a name
- specify the name in Command constructor or using .name()`);
      }
      opts = opts || {};
      if (opts.isDefault)
        this._defaultCommandName = cmd._name;
      if (opts.noHelp || opts.hidden)
        cmd._hidden = true;
      this._registerCommand(cmd);
      cmd.parent = this;
      cmd._checkForBrokenPassThrough();
      return this;
    }
    createArgument(name, description) {
      return new Argument(name, description);
    }
    argument(name, description, fn, defaultValue) {
      const argument = this.createArgument(name, description);
      if (typeof fn === "function") {
        argument.default(defaultValue).argParser(fn);
      } else {
        argument.default(fn);
      }
      this.addArgument(argument);
      return this;
    }
    arguments(names) {
      names.trim().split(/ +/).forEach((detail) => {
        this.argument(detail);
      });
      return this;
    }
    addArgument(argument) {
      const previousArgument = this.registeredArguments.slice(-1)[0];
      if (previousArgument && previousArgument.variadic) {
        throw new Error(`only the last argument can be variadic '${previousArgument.name()}'`);
      }
      if (argument.required && argument.defaultValue !== undefined && argument.parseArg === undefined) {
        throw new Error(`a default value for a required argument is never used: '${argument.name()}'`);
      }
      this.registeredArguments.push(argument);
      return this;
    }
    helpCommand(enableOrNameAndArgs, description) {
      if (typeof enableOrNameAndArgs === "boolean") {
        this._addImplicitHelpCommand = enableOrNameAndArgs;
        return this;
      }
      enableOrNameAndArgs = enableOrNameAndArgs ?? "help [command]";
      const [, helpName, helpArgs] = enableOrNameAndArgs.match(/([^ ]+) *(.*)/);
      const helpDescription = description ?? "display help for command";
      const helpCommand = this.createCommand(helpName);
      helpCommand.helpOption(false);
      if (helpArgs)
        helpCommand.arguments(helpArgs);
      if (helpDescription)
        helpCommand.description(helpDescription);
      this._addImplicitHelpCommand = true;
      this._helpCommand = helpCommand;
      return this;
    }
    addHelpCommand(helpCommand, deprecatedDescription) {
      if (typeof helpCommand !== "object") {
        this.helpCommand(helpCommand, deprecatedDescription);
        return this;
      }
      this._addImplicitHelpCommand = true;
      this._helpCommand = helpCommand;
      return this;
    }
    _getHelpCommand() {
      const hasImplicitHelpCommand = this._addImplicitHelpCommand ?? (this.commands.length && !this._actionHandler && !this._findCommand("help"));
      if (hasImplicitHelpCommand) {
        if (this._helpCommand === undefined) {
          this.helpCommand(undefined, undefined);
        }
        return this._helpCommand;
      }
      return null;
    }
    hook(event, listener) {
      const allowedValues = ["preSubcommand", "preAction", "postAction"];
      if (!allowedValues.includes(event)) {
        throw new Error(`Unexpected value for event passed to hook : '${event}'.
Expecting one of '${allowedValues.join("', '")}'`);
      }
      if (this._lifeCycleHooks[event]) {
        this._lifeCycleHooks[event].push(listener);
      } else {
        this._lifeCycleHooks[event] = [listener];
      }
      return this;
    }
    exitOverride(fn) {
      if (fn) {
        this._exitCallback = fn;
      } else {
        this._exitCallback = (err) => {
          if (err.code !== "commander.executeSubCommandAsync") {
            throw err;
          } else {}
        };
      }
      return this;
    }
    _exit(exitCode, code, message) {
      if (this._exitCallback) {
        this._exitCallback(new CommanderError(exitCode, code, message));
      }
      process2.exit(exitCode);
    }
    action(fn) {
      const listener = (args) => {
        const expectedArgsCount = this.registeredArguments.length;
        const actionArgs = args.slice(0, expectedArgsCount);
        if (this._storeOptionsAsProperties) {
          actionArgs[expectedArgsCount] = this;
        } else {
          actionArgs[expectedArgsCount] = this.opts();
        }
        actionArgs.push(this);
        return fn.apply(this, actionArgs);
      };
      this._actionHandler = listener;
      return this;
    }
    createOption(flags, description) {
      return new Option(flags, description);
    }
    _callParseArg(target, value, previous, invalidArgumentMessage) {
      try {
        return target.parseArg(value, previous);
      } catch (err) {
        if (err.code === "commander.invalidArgument") {
          const message = `${invalidArgumentMessage} ${err.message}`;
          this.error(message, { exitCode: err.exitCode, code: err.code });
        }
        throw err;
      }
    }
    _registerOption(option) {
      const matchingOption = option.short && this._findOption(option.short) || option.long && this._findOption(option.long);
      if (matchingOption) {
        const matchingFlag = option.long && this._findOption(option.long) ? option.long : option.short;
        throw new Error(`Cannot add option '${option.flags}'${this._name && ` to command '${this._name}'`} due to conflicting flag '${matchingFlag}'
-  already used by option '${matchingOption.flags}'`);
      }
      this.options.push(option);
    }
    _registerCommand(command) {
      const knownBy = (cmd) => {
        return [cmd.name()].concat(cmd.aliases());
      };
      const alreadyUsed = knownBy(command).find((name) => this._findCommand(name));
      if (alreadyUsed) {
        const existingCmd = knownBy(this._findCommand(alreadyUsed)).join("|");
        const newCmd = knownBy(command).join("|");
        throw new Error(`cannot add command '${newCmd}' as already have command '${existingCmd}'`);
      }
      this.commands.push(command);
    }
    addOption(option) {
      this._registerOption(option);
      const oname = option.name();
      const name = option.attributeName();
      if (option.negate) {
        const positiveLongFlag = option.long.replace(/^--no-/, "--");
        if (!this._findOption(positiveLongFlag)) {
          this.setOptionValueWithSource(name, option.defaultValue === undefined ? true : option.defaultValue, "default");
        }
      } else if (option.defaultValue !== undefined) {
        this.setOptionValueWithSource(name, option.defaultValue, "default");
      }
      const handleOptionValue = (val, invalidValueMessage, valueSource) => {
        if (val == null && option.presetArg !== undefined) {
          val = option.presetArg;
        }
        const oldValue = this.getOptionValue(name);
        if (val !== null && option.parseArg) {
          val = this._callParseArg(option, val, oldValue, invalidValueMessage);
        } else if (val !== null && option.variadic) {
          val = option._concatValue(val, oldValue);
        }
        if (val == null) {
          if (option.negate) {
            val = false;
          } else if (option.isBoolean() || option.optional) {
            val = true;
          } else {
            val = "";
          }
        }
        this.setOptionValueWithSource(name, val, valueSource);
      };
      this.on("option:" + oname, (val) => {
        const invalidValueMessage = `error: option '${option.flags}' argument '${val}' is invalid.`;
        handleOptionValue(val, invalidValueMessage, "cli");
      });
      if (option.envVar) {
        this.on("optionEnv:" + oname, (val) => {
          const invalidValueMessage = `error: option '${option.flags}' value '${val}' from env '${option.envVar}' is invalid.`;
          handleOptionValue(val, invalidValueMessage, "env");
        });
      }
      return this;
    }
    _optionEx(config, flags, description, fn, defaultValue) {
      if (typeof flags === "object" && flags instanceof Option) {
        throw new Error("To add an Option object use addOption() instead of option() or requiredOption()");
      }
      const option = this.createOption(flags, description);
      option.makeOptionMandatory(!!config.mandatory);
      if (typeof fn === "function") {
        option.default(defaultValue).argParser(fn);
      } else if (fn instanceof RegExp) {
        const regex = fn;
        fn = (val, def) => {
          const m = regex.exec(val);
          return m ? m[0] : def;
        };
        option.default(defaultValue).argParser(fn);
      } else {
        option.default(fn);
      }
      return this.addOption(option);
    }
    option(flags, description, parseArg, defaultValue) {
      return this._optionEx({}, flags, description, parseArg, defaultValue);
    }
    requiredOption(flags, description, parseArg, defaultValue) {
      return this._optionEx({ mandatory: true }, flags, description, parseArg, defaultValue);
    }
    combineFlagAndOptionalValue(combine = true) {
      this._combineFlagAndOptionalValue = !!combine;
      return this;
    }
    allowUnknownOption(allowUnknown = true) {
      this._allowUnknownOption = !!allowUnknown;
      return this;
    }
    allowExcessArguments(allowExcess = true) {
      this._allowExcessArguments = !!allowExcess;
      return this;
    }
    enablePositionalOptions(positional = true) {
      this._enablePositionalOptions = !!positional;
      return this;
    }
    passThroughOptions(passThrough = true) {
      this._passThroughOptions = !!passThrough;
      this._checkForBrokenPassThrough();
      return this;
    }
    _checkForBrokenPassThrough() {
      if (this.parent && this._passThroughOptions && !this.parent._enablePositionalOptions) {
        throw new Error(`passThroughOptions cannot be used for '${this._name}' without turning on enablePositionalOptions for parent command(s)`);
      }
    }
    storeOptionsAsProperties(storeAsProperties = true) {
      if (this.options.length) {
        throw new Error("call .storeOptionsAsProperties() before adding options");
      }
      if (Object.keys(this._optionValues).length) {
        throw new Error("call .storeOptionsAsProperties() before setting option values");
      }
      this._storeOptionsAsProperties = !!storeAsProperties;
      return this;
    }
    getOptionValue(key) {
      if (this._storeOptionsAsProperties) {
        return this[key];
      }
      return this._optionValues[key];
    }
    setOptionValue(key, value) {
      return this.setOptionValueWithSource(key, value, undefined);
    }
    setOptionValueWithSource(key, value, source) {
      if (this._storeOptionsAsProperties) {
        this[key] = value;
      } else {
        this._optionValues[key] = value;
      }
      this._optionValueSources[key] = source;
      return this;
    }
    getOptionValueSource(key) {
      return this._optionValueSources[key];
    }
    getOptionValueSourceWithGlobals(key) {
      let source;
      this._getCommandAndAncestors().forEach((cmd) => {
        if (cmd.getOptionValueSource(key) !== undefined) {
          source = cmd.getOptionValueSource(key);
        }
      });
      return source;
    }
    _prepareUserArgs(argv, parseOptions) {
      if (argv !== undefined && !Array.isArray(argv)) {
        throw new Error("first parameter to parse must be array or undefined");
      }
      parseOptions = parseOptions || {};
      if (argv === undefined && parseOptions.from === undefined) {
        if (process2.versions?.electron) {
          parseOptions.from = "electron";
        }
        const execArgv = process2.execArgv ?? [];
        if (execArgv.includes("-e") || execArgv.includes("--eval") || execArgv.includes("-p") || execArgv.includes("--print")) {
          parseOptions.from = "eval";
        }
      }
      if (argv === undefined) {
        argv = process2.argv;
      }
      this.rawArgs = argv.slice();
      let userArgs;
      switch (parseOptions.from) {
        case undefined:
        case "node":
          this._scriptPath = argv[1];
          userArgs = argv.slice(2);
          break;
        case "electron":
          if (process2.defaultApp) {
            this._scriptPath = argv[1];
            userArgs = argv.slice(2);
          } else {
            userArgs = argv.slice(1);
          }
          break;
        case "user":
          userArgs = argv.slice(0);
          break;
        case "eval":
          userArgs = argv.slice(1);
          break;
        default:
          throw new Error(`unexpected parse option { from: '${parseOptions.from}' }`);
      }
      if (!this._name && this._scriptPath)
        this.nameFromFilename(this._scriptPath);
      this._name = this._name || "program";
      return userArgs;
    }
    parse(argv, parseOptions) {
      const userArgs = this._prepareUserArgs(argv, parseOptions);
      this._parseCommand([], userArgs);
      return this;
    }
    async parseAsync(argv, parseOptions) {
      const userArgs = this._prepareUserArgs(argv, parseOptions);
      await this._parseCommand([], userArgs);
      return this;
    }
    _executeSubCommand(subcommand, args) {
      args = args.slice();
      let launchWithNode = false;
      const sourceExt = [".js", ".ts", ".tsx", ".mjs", ".cjs"];
      function findFile(baseDir, baseName) {
        const localBin = path.resolve(baseDir, baseName);
        if (fs.existsSync(localBin))
          return localBin;
        if (sourceExt.includes(path.extname(baseName)))
          return;
        const foundExt = sourceExt.find((ext) => fs.existsSync(`${localBin}${ext}`));
        if (foundExt)
          return `${localBin}${foundExt}`;
        return;
      }
      this._checkForMissingMandatoryOptions();
      this._checkForConflictingOptions();
      let executableFile = subcommand._executableFile || `${this._name}-${subcommand._name}`;
      let executableDir = this._executableDir || "";
      if (this._scriptPath) {
        let resolvedScriptPath;
        try {
          resolvedScriptPath = fs.realpathSync(this._scriptPath);
        } catch (err) {
          resolvedScriptPath = this._scriptPath;
        }
        executableDir = path.resolve(path.dirname(resolvedScriptPath), executableDir);
      }
      if (executableDir) {
        let localFile = findFile(executableDir, executableFile);
        if (!localFile && !subcommand._executableFile && this._scriptPath) {
          const legacyName = path.basename(this._scriptPath, path.extname(this._scriptPath));
          if (legacyName !== this._name) {
            localFile = findFile(executableDir, `${legacyName}-${subcommand._name}`);
          }
        }
        executableFile = localFile || executableFile;
      }
      launchWithNode = sourceExt.includes(path.extname(executableFile));
      let proc;
      if (process2.platform !== "win32") {
        if (launchWithNode) {
          args.unshift(executableFile);
          args = incrementNodeInspectorPort(process2.execArgv).concat(args);
          proc = childProcess.spawn(process2.argv[0], args, { stdio: "inherit" });
        } else {
          proc = childProcess.spawn(executableFile, args, { stdio: "inherit" });
        }
      } else {
        args.unshift(executableFile);
        args = incrementNodeInspectorPort(process2.execArgv).concat(args);
        proc = childProcess.spawn(process2.execPath, args, { stdio: "inherit" });
      }
      if (!proc.killed) {
        const signals = ["SIGUSR1", "SIGUSR2", "SIGTERM", "SIGINT", "SIGHUP"];
        signals.forEach((signal) => {
          process2.on(signal, () => {
            if (proc.killed === false && proc.exitCode === null) {
              proc.kill(signal);
            }
          });
        });
      }
      const exitCallback = this._exitCallback;
      proc.on("close", (code) => {
        code = code ?? 1;
        if (!exitCallback) {
          process2.exit(code);
        } else {
          exitCallback(new CommanderError(code, "commander.executeSubCommandAsync", "(close)"));
        }
      });
      proc.on("error", (err) => {
        if (err.code === "ENOENT") {
          const executableDirMessage = executableDir ? `searched for local subcommand relative to directory '${executableDir}'` : "no directory for search for local subcommand, use .executableDir() to supply a custom directory";
          const executableMissing = `'${executableFile}' does not exist
 - if '${subcommand._name}' is not meant to be an executable command, remove description parameter from '.command()' and use '.description()' instead
 - if the default executable name is not suitable, use the executableFile option to supply a custom name or path
 - ${executableDirMessage}`;
          throw new Error(executableMissing);
        } else if (err.code === "EACCES") {
          throw new Error(`'${executableFile}' not executable`);
        }
        if (!exitCallback) {
          process2.exit(1);
        } else {
          const wrappedError = new CommanderError(1, "commander.executeSubCommandAsync", "(error)");
          wrappedError.nestedError = err;
          exitCallback(wrappedError);
        }
      });
      this.runningCommand = proc;
    }
    _dispatchSubcommand(commandName, operands, unknown) {
      const subCommand = this._findCommand(commandName);
      if (!subCommand)
        this.help({ error: true });
      let promiseChain;
      promiseChain = this._chainOrCallSubCommandHook(promiseChain, subCommand, "preSubcommand");
      promiseChain = this._chainOrCall(promiseChain, () => {
        if (subCommand._executableHandler) {
          this._executeSubCommand(subCommand, operands.concat(unknown));
        } else {
          return subCommand._parseCommand(operands, unknown);
        }
      });
      return promiseChain;
    }
    _dispatchHelpCommand(subcommandName) {
      if (!subcommandName) {
        this.help();
      }
      const subCommand = this._findCommand(subcommandName);
      if (subCommand && !subCommand._executableHandler) {
        subCommand.help();
      }
      return this._dispatchSubcommand(subcommandName, [], [this._getHelpOption()?.long ?? this._getHelpOption()?.short ?? "--help"]);
    }
    _checkNumberOfArguments() {
      this.registeredArguments.forEach((arg, i) => {
        if (arg.required && this.args[i] == null) {
          this.missingArgument(arg.name());
        }
      });
      if (this.registeredArguments.length > 0 && this.registeredArguments[this.registeredArguments.length - 1].variadic) {
        return;
      }
      if (this.args.length > this.registeredArguments.length) {
        this._excessArguments(this.args);
      }
    }
    _processArguments() {
      const myParseArg = (argument, value, previous) => {
        let parsedValue = value;
        if (value !== null && argument.parseArg) {
          const invalidValueMessage = `error: command-argument value '${value}' is invalid for argument '${argument.name()}'.`;
          parsedValue = this._callParseArg(argument, value, previous, invalidValueMessage);
        }
        return parsedValue;
      };
      this._checkNumberOfArguments();
      const processedArgs = [];
      this.registeredArguments.forEach((declaredArg, index) => {
        let value = declaredArg.defaultValue;
        if (declaredArg.variadic) {
          if (index < this.args.length) {
            value = this.args.slice(index);
            if (declaredArg.parseArg) {
              value = value.reduce((processed, v) => {
                return myParseArg(declaredArg, v, processed);
              }, declaredArg.defaultValue);
            }
          } else if (value === undefined) {
            value = [];
          }
        } else if (index < this.args.length) {
          value = this.args[index];
          if (declaredArg.parseArg) {
            value = myParseArg(declaredArg, value, declaredArg.defaultValue);
          }
        }
        processedArgs[index] = value;
      });
      this.processedArgs = processedArgs;
    }
    _chainOrCall(promise, fn) {
      if (promise && promise.then && typeof promise.then === "function") {
        return promise.then(() => fn());
      }
      return fn();
    }
    _chainOrCallHooks(promise, event) {
      let result = promise;
      const hooks = [];
      this._getCommandAndAncestors().reverse().filter((cmd) => cmd._lifeCycleHooks[event] !== undefined).forEach((hookedCommand) => {
        hookedCommand._lifeCycleHooks[event].forEach((callback) => {
          hooks.push({ hookedCommand, callback });
        });
      });
      if (event === "postAction") {
        hooks.reverse();
      }
      hooks.forEach((hookDetail) => {
        result = this._chainOrCall(result, () => {
          return hookDetail.callback(hookDetail.hookedCommand, this);
        });
      });
      return result;
    }
    _chainOrCallSubCommandHook(promise, subCommand, event) {
      let result = promise;
      if (this._lifeCycleHooks[event] !== undefined) {
        this._lifeCycleHooks[event].forEach((hook) => {
          result = this._chainOrCall(result, () => {
            return hook(this, subCommand);
          });
        });
      }
      return result;
    }
    _parseCommand(operands, unknown) {
      const parsed = this.parseOptions(unknown);
      this._parseOptionsEnv();
      this._parseOptionsImplied();
      operands = operands.concat(parsed.operands);
      unknown = parsed.unknown;
      this.args = operands.concat(unknown);
      if (operands && this._findCommand(operands[0])) {
        return this._dispatchSubcommand(operands[0], operands.slice(1), unknown);
      }
      if (this._getHelpCommand() && operands[0] === this._getHelpCommand().name()) {
        return this._dispatchHelpCommand(operands[1]);
      }
      if (this._defaultCommandName) {
        this._outputHelpIfRequested(unknown);
        return this._dispatchSubcommand(this._defaultCommandName, operands, unknown);
      }
      if (this.commands.length && this.args.length === 0 && !this._actionHandler && !this._defaultCommandName) {
        this.help({ error: true });
      }
      this._outputHelpIfRequested(parsed.unknown);
      this._checkForMissingMandatoryOptions();
      this._checkForConflictingOptions();
      const checkForUnknownOptions = () => {
        if (parsed.unknown.length > 0) {
          this.unknownOption(parsed.unknown[0]);
        }
      };
      const commandEvent = `command:${this.name()}`;
      if (this._actionHandler) {
        checkForUnknownOptions();
        this._processArguments();
        let promiseChain;
        promiseChain = this._chainOrCallHooks(promiseChain, "preAction");
        promiseChain = this._chainOrCall(promiseChain, () => this._actionHandler(this.processedArgs));
        if (this.parent) {
          promiseChain = this._chainOrCall(promiseChain, () => {
            this.parent.emit(commandEvent, operands, unknown);
          });
        }
        promiseChain = this._chainOrCallHooks(promiseChain, "postAction");
        return promiseChain;
      }
      if (this.parent && this.parent.listenerCount(commandEvent)) {
        checkForUnknownOptions();
        this._processArguments();
        this.parent.emit(commandEvent, operands, unknown);
      } else if (operands.length) {
        if (this._findCommand("*")) {
          return this._dispatchSubcommand("*", operands, unknown);
        }
        if (this.listenerCount("command:*")) {
          this.emit("command:*", operands, unknown);
        } else if (this.commands.length) {
          this.unknownCommand();
        } else {
          checkForUnknownOptions();
          this._processArguments();
        }
      } else if (this.commands.length) {
        checkForUnknownOptions();
        this.help({ error: true });
      } else {
        checkForUnknownOptions();
        this._processArguments();
      }
    }
    _findCommand(name) {
      if (!name)
        return;
      return this.commands.find((cmd) => cmd._name === name || cmd._aliases.includes(name));
    }
    _findOption(arg) {
      return this.options.find((option) => option.is(arg));
    }
    _checkForMissingMandatoryOptions() {
      this._getCommandAndAncestors().forEach((cmd) => {
        cmd.options.forEach((anOption) => {
          if (anOption.mandatory && cmd.getOptionValue(anOption.attributeName()) === undefined) {
            cmd.missingMandatoryOptionValue(anOption);
          }
        });
      });
    }
    _checkForConflictingLocalOptions() {
      const definedNonDefaultOptions = this.options.filter((option) => {
        const optionKey = option.attributeName();
        if (this.getOptionValue(optionKey) === undefined) {
          return false;
        }
        return this.getOptionValueSource(optionKey) !== "default";
      });
      const optionsWithConflicting = definedNonDefaultOptions.filter((option) => option.conflictsWith.length > 0);
      optionsWithConflicting.forEach((option) => {
        const conflictingAndDefined = definedNonDefaultOptions.find((defined) => option.conflictsWith.includes(defined.attributeName()));
        if (conflictingAndDefined) {
          this._conflictingOption(option, conflictingAndDefined);
        }
      });
    }
    _checkForConflictingOptions() {
      this._getCommandAndAncestors().forEach((cmd) => {
        cmd._checkForConflictingLocalOptions();
      });
    }
    parseOptions(argv) {
      const operands = [];
      const unknown = [];
      let dest = operands;
      const args = argv.slice();
      function maybeOption(arg) {
        return arg.length > 1 && arg[0] === "-";
      }
      let activeVariadicOption = null;
      while (args.length) {
        const arg = args.shift();
        if (arg === "--") {
          if (dest === unknown)
            dest.push(arg);
          dest.push(...args);
          break;
        }
        if (activeVariadicOption && !maybeOption(arg)) {
          this.emit(`option:${activeVariadicOption.name()}`, arg);
          continue;
        }
        activeVariadicOption = null;
        if (maybeOption(arg)) {
          const option = this._findOption(arg);
          if (option) {
            if (option.required) {
              const value = args.shift();
              if (value === undefined)
                this.optionMissingArgument(option);
              this.emit(`option:${option.name()}`, value);
            } else if (option.optional) {
              let value = null;
              if (args.length > 0 && !maybeOption(args[0])) {
                value = args.shift();
              }
              this.emit(`option:${option.name()}`, value);
            } else {
              this.emit(`option:${option.name()}`);
            }
            activeVariadicOption = option.variadic ? option : null;
            continue;
          }
        }
        if (arg.length > 2 && arg[0] === "-" && arg[1] !== "-") {
          const option = this._findOption(`-${arg[1]}`);
          if (option) {
            if (option.required || option.optional && this._combineFlagAndOptionalValue) {
              this.emit(`option:${option.name()}`, arg.slice(2));
            } else {
              this.emit(`option:${option.name()}`);
              args.unshift(`-${arg.slice(2)}`);
            }
            continue;
          }
        }
        if (/^--[^=]+=/.test(arg)) {
          const index = arg.indexOf("=");
          const option = this._findOption(arg.slice(0, index));
          if (option && (option.required || option.optional)) {
            this.emit(`option:${option.name()}`, arg.slice(index + 1));
            continue;
          }
        }
        if (maybeOption(arg)) {
          dest = unknown;
        }
        if ((this._enablePositionalOptions || this._passThroughOptions) && operands.length === 0 && unknown.length === 0) {
          if (this._findCommand(arg)) {
            operands.push(arg);
            if (args.length > 0)
              unknown.push(...args);
            break;
          } else if (this._getHelpCommand() && arg === this._getHelpCommand().name()) {
            operands.push(arg);
            if (args.length > 0)
              operands.push(...args);
            break;
          } else if (this._defaultCommandName) {
            unknown.push(arg);
            if (args.length > 0)
              unknown.push(...args);
            break;
          }
        }
        if (this._passThroughOptions) {
          dest.push(arg);
          if (args.length > 0)
            dest.push(...args);
          break;
        }
        dest.push(arg);
      }
      return { operands, unknown };
    }
    opts() {
      if (this._storeOptionsAsProperties) {
        const result = {};
        const len = this.options.length;
        for (let i = 0;i < len; i++) {
          const key = this.options[i].attributeName();
          result[key] = key === this._versionOptionName ? this._version : this[key];
        }
        return result;
      }
      return this._optionValues;
    }
    optsWithGlobals() {
      return this._getCommandAndAncestors().reduce((combinedOptions, cmd) => Object.assign(combinedOptions, cmd.opts()), {});
    }
    error(message, errorOptions) {
      this._outputConfiguration.outputError(`${message}
`, this._outputConfiguration.writeErr);
      if (typeof this._showHelpAfterError === "string") {
        this._outputConfiguration.writeErr(`${this._showHelpAfterError}
`);
      } else if (this._showHelpAfterError) {
        this._outputConfiguration.writeErr(`
`);
        this.outputHelp({ error: true });
      }
      const config = errorOptions || {};
      const exitCode = config.exitCode || 1;
      const code = config.code || "commander.error";
      this._exit(exitCode, code, message);
    }
    _parseOptionsEnv() {
      this.options.forEach((option) => {
        if (option.envVar && option.envVar in process2.env) {
          const optionKey = option.attributeName();
          if (this.getOptionValue(optionKey) === undefined || ["default", "config", "env"].includes(this.getOptionValueSource(optionKey))) {
            if (option.required || option.optional) {
              this.emit(`optionEnv:${option.name()}`, process2.env[option.envVar]);
            } else {
              this.emit(`optionEnv:${option.name()}`);
            }
          }
        }
      });
    }
    _parseOptionsImplied() {
      const dualHelper = new DualOptions(this.options);
      const hasCustomOptionValue = (optionKey) => {
        return this.getOptionValue(optionKey) !== undefined && !["default", "implied"].includes(this.getOptionValueSource(optionKey));
      };
      this.options.filter((option) => option.implied !== undefined && hasCustomOptionValue(option.attributeName()) && dualHelper.valueFromOption(this.getOptionValue(option.attributeName()), option)).forEach((option) => {
        Object.keys(option.implied).filter((impliedKey) => !hasCustomOptionValue(impliedKey)).forEach((impliedKey) => {
          this.setOptionValueWithSource(impliedKey, option.implied[impliedKey], "implied");
        });
      });
    }
    missingArgument(name) {
      const message = `error: missing required argument '${name}'`;
      this.error(message, { code: "commander.missingArgument" });
    }
    optionMissingArgument(option) {
      const message = `error: option '${option.flags}' argument missing`;
      this.error(message, { code: "commander.optionMissingArgument" });
    }
    missingMandatoryOptionValue(option) {
      const message = `error: required option '${option.flags}' not specified`;
      this.error(message, { code: "commander.missingMandatoryOptionValue" });
    }
    _conflictingOption(option, conflictingOption) {
      const findBestOptionFromValue = (option2) => {
        const optionKey = option2.attributeName();
        const optionValue = this.getOptionValue(optionKey);
        const negativeOption = this.options.find((target) => target.negate && optionKey === target.attributeName());
        const positiveOption = this.options.find((target) => !target.negate && optionKey === target.attributeName());
        if (negativeOption && (negativeOption.presetArg === undefined && optionValue === false || negativeOption.presetArg !== undefined && optionValue === negativeOption.presetArg)) {
          return negativeOption;
        }
        return positiveOption || option2;
      };
      const getErrorMessage = (option2) => {
        const bestOption = findBestOptionFromValue(option2);
        const optionKey = bestOption.attributeName();
        const source = this.getOptionValueSource(optionKey);
        if (source === "env") {
          return `environment variable '${bestOption.envVar}'`;
        }
        return `option '${bestOption.flags}'`;
      };
      const message = `error: ${getErrorMessage(option)} cannot be used with ${getErrorMessage(conflictingOption)}`;
      this.error(message, { code: "commander.conflictingOption" });
    }
    unknownOption(flag) {
      if (this._allowUnknownOption)
        return;
      let suggestion = "";
      if (flag.startsWith("--") && this._showSuggestionAfterError) {
        let candidateFlags = [];
        let command = this;
        do {
          const moreFlags = command.createHelp().visibleOptions(command).filter((option) => option.long).map((option) => option.long);
          candidateFlags = candidateFlags.concat(moreFlags);
          command = command.parent;
        } while (command && !command._enablePositionalOptions);
        suggestion = suggestSimilar(flag, candidateFlags);
      }
      const message = `error: unknown option '${flag}'${suggestion}`;
      this.error(message, { code: "commander.unknownOption" });
    }
    _excessArguments(receivedArgs) {
      if (this._allowExcessArguments)
        return;
      const expected = this.registeredArguments.length;
      const s = expected === 1 ? "" : "s";
      const forSubcommand = this.parent ? ` for '${this.name()}'` : "";
      const message = `error: too many arguments${forSubcommand}. Expected ${expected} argument${s} but got ${receivedArgs.length}.`;
      this.error(message, { code: "commander.excessArguments" });
    }
    unknownCommand() {
      const unknownName = this.args[0];
      let suggestion = "";
      if (this._showSuggestionAfterError) {
        const candidateNames = [];
        this.createHelp().visibleCommands(this).forEach((command) => {
          candidateNames.push(command.name());
          if (command.alias())
            candidateNames.push(command.alias());
        });
        suggestion = suggestSimilar(unknownName, candidateNames);
      }
      const message = `error: unknown command '${unknownName}'${suggestion}`;
      this.error(message, { code: "commander.unknownCommand" });
    }
    version(str, flags, description) {
      if (str === undefined)
        return this._version;
      this._version = str;
      flags = flags || "-V, --version";
      description = description || "output the version number";
      const versionOption = this.createOption(flags, description);
      this._versionOptionName = versionOption.attributeName();
      this._registerOption(versionOption);
      this.on("option:" + versionOption.name(), () => {
        this._outputConfiguration.writeOut(`${str}
`);
        this._exit(0, "commander.version", str);
      });
      return this;
    }
    description(str, argsDescription) {
      if (str === undefined && argsDescription === undefined)
        return this._description;
      this._description = str;
      if (argsDescription) {
        this._argsDescription = argsDescription;
      }
      return this;
    }
    summary(str) {
      if (str === undefined)
        return this._summary;
      this._summary = str;
      return this;
    }
    alias(alias) {
      if (alias === undefined)
        return this._aliases[0];
      let command = this;
      if (this.commands.length !== 0 && this.commands[this.commands.length - 1]._executableHandler) {
        command = this.commands[this.commands.length - 1];
      }
      if (alias === command._name)
        throw new Error("Command alias can't be the same as its name");
      const matchingCommand = this.parent?._findCommand(alias);
      if (matchingCommand) {
        const existingCmd = [matchingCommand.name()].concat(matchingCommand.aliases()).join("|");
        throw new Error(`cannot add alias '${alias}' to command '${this.name()}' as already have command '${existingCmd}'`);
      }
      command._aliases.push(alias);
      return this;
    }
    aliases(aliases) {
      if (aliases === undefined)
        return this._aliases;
      aliases.forEach((alias) => this.alias(alias));
      return this;
    }
    usage(str) {
      if (str === undefined) {
        if (this._usage)
          return this._usage;
        const args = this.registeredArguments.map((arg) => {
          return humanReadableArgName(arg);
        });
        return [].concat(this.options.length || this._helpOption !== null ? "[options]" : [], this.commands.length ? "[command]" : [], this.registeredArguments.length ? args : []).join(" ");
      }
      this._usage = str;
      return this;
    }
    name(str) {
      if (str === undefined)
        return this._name;
      this._name = str;
      return this;
    }
    nameFromFilename(filename) {
      this._name = path.basename(filename, path.extname(filename));
      return this;
    }
    executableDir(path2) {
      if (path2 === undefined)
        return this._executableDir;
      this._executableDir = path2;
      return this;
    }
    helpInformation(contextOptions) {
      const helper = this.createHelp();
      if (helper.helpWidth === undefined) {
        helper.helpWidth = contextOptions && contextOptions.error ? this._outputConfiguration.getErrHelpWidth() : this._outputConfiguration.getOutHelpWidth();
      }
      return helper.formatHelp(this, helper);
    }
    _getHelpContext(contextOptions) {
      contextOptions = contextOptions || {};
      const context = { error: !!contextOptions.error };
      let write;
      if (context.error) {
        write = (arg) => this._outputConfiguration.writeErr(arg);
      } else {
        write = (arg) => this._outputConfiguration.writeOut(arg);
      }
      context.write = contextOptions.write || write;
      context.command = this;
      return context;
    }
    outputHelp(contextOptions) {
      let deprecatedCallback;
      if (typeof contextOptions === "function") {
        deprecatedCallback = contextOptions;
        contextOptions = undefined;
      }
      const context = this._getHelpContext(contextOptions);
      this._getCommandAndAncestors().reverse().forEach((command) => command.emit("beforeAllHelp", context));
      this.emit("beforeHelp", context);
      let helpInformation = this.helpInformation(context);
      if (deprecatedCallback) {
        helpInformation = deprecatedCallback(helpInformation);
        if (typeof helpInformation !== "string" && !Buffer.isBuffer(helpInformation)) {
          throw new Error("outputHelp callback must return a string or a Buffer");
        }
      }
      context.write(helpInformation);
      if (this._getHelpOption()?.long) {
        this.emit(this._getHelpOption().long);
      }
      this.emit("afterHelp", context);
      this._getCommandAndAncestors().forEach((command) => command.emit("afterAllHelp", context));
    }
    helpOption(flags, description) {
      if (typeof flags === "boolean") {
        if (flags) {
          this._helpOption = this._helpOption ?? undefined;
        } else {
          this._helpOption = null;
        }
        return this;
      }
      flags = flags ?? "-h, --help";
      description = description ?? "display help for command";
      this._helpOption = this.createOption(flags, description);
      return this;
    }
    _getHelpOption() {
      if (this._helpOption === undefined) {
        this.helpOption(undefined, undefined);
      }
      return this._helpOption;
    }
    addHelpOption(option) {
      this._helpOption = option;
      return this;
    }
    help(contextOptions) {
      this.outputHelp(contextOptions);
      let exitCode = process2.exitCode || 0;
      if (exitCode === 0 && contextOptions && typeof contextOptions !== "function" && contextOptions.error) {
        exitCode = 1;
      }
      this._exit(exitCode, "commander.help", "(outputHelp)");
    }
    addHelpText(position, text) {
      const allowedValues = ["beforeAll", "before", "after", "afterAll"];
      if (!allowedValues.includes(position)) {
        throw new Error(`Unexpected value for position to addHelpText.
Expecting one of '${allowedValues.join("', '")}'`);
      }
      const helpEvent = `${position}Help`;
      this.on(helpEvent, (context) => {
        let helpStr;
        if (typeof text === "function") {
          helpStr = text({ error: context.error, command: context.command });
        } else {
          helpStr = text;
        }
        if (helpStr) {
          context.write(`${helpStr}
`);
        }
      });
      return this;
    }
    _outputHelpIfRequested(args) {
      const helpOption = this._getHelpOption();
      const helpRequested = helpOption && args.find((arg) => helpOption.is(arg));
      if (helpRequested) {
        this.outputHelp();
        this._exit(0, "commander.helpDisplayed", "(outputHelp)");
      }
    }
  }
  function incrementNodeInspectorPort(args) {
    return args.map((arg) => {
      if (!arg.startsWith("--inspect")) {
        return arg;
      }
      let debugOption;
      let debugHost = "127.0.0.1";
      let debugPort = "9229";
      let match;
      if ((match = arg.match(/^(--inspect(-brk)?)$/)) !== null) {
        debugOption = match[1];
      } else if ((match = arg.match(/^(--inspect(-brk|-port)?)=([^:]+)$/)) !== null) {
        debugOption = match[1];
        if (/^\d+$/.test(match[3])) {
          debugPort = match[3];
        } else {
          debugHost = match[3];
        }
      } else if ((match = arg.match(/^(--inspect(-brk|-port)?)=([^:]+):(\d+)$/)) !== null) {
        debugOption = match[1];
        debugHost = match[3];
        debugPort = match[4];
      }
      if (debugOption && debugPort !== "0") {
        return `${debugOption}=${debugHost}:${parseInt(debugPort) + 1}`;
      }
      return arg;
    });
  }
  exports.Command = Command;
});

// node_modules/commander/index.js
var require_commander = __commonJS((exports) => {
  var { Argument } = require_argument();
  var { Command } = require_command();
  var { CommanderError, InvalidArgumentError } = require_error();
  var { Help } = require_help();
  var { Option } = require_option();
  exports.program = new Command;
  exports.createCommand = (name) => new Command(name);
  exports.createOption = (flags, description) => new Option(flags, description);
  exports.createArgument = (name, description) => new Argument(name, description);
  exports.Command = Command;
  exports.Option = Option;
  exports.Argument = Argument;
  exports.Help = Help;
  exports.CommanderError = CommanderError;
  exports.InvalidArgumentError = InvalidArgumentError;
  exports.InvalidOptionArgumentError = InvalidArgumentError;
});

// node_modules/commander/esm.mjs
var import__ = __toESM(require_commander(), 1);
var {
  program,
  createCommand,
  createArgument,
  createOption,
  CommanderError,
  InvalidArgumentError,
  InvalidOptionArgumentError,
  Command,
  Argument,
  Option,
  Help
} = import__.default;

// src/commands/create.ts
import { existsSync as existsSync3, mkdirSync as mkdirSync2, readdirSync, renameSync, rmSync, writeFileSync as writeFileSync3, readFileSync as readFileSync2 } from "fs";
import { resolve as resolve2, join as join2 } from "path";

// src/utils.ts
import { spawn, spawnSync } from "child_process";
import { existsSync as existsSync2, writeFileSync as writeFileSync2, unlinkSync } from "fs";
import { basename, resolve } from "path";

// src/config.ts
import { homedir } from "os";
import { join } from "path";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
var ZEBU_HOME = join(homedir(), ".zdev");
var CONFIG_PATH = join(ZEBU_HOME, "config.json");
var WORKTREES_DIR = join(ZEBU_HOME, "worktrees");
var SEEDS_DIR = join(ZEBU_HOME, "seeds");
var DEFAULT_CONFIG = {
  nextFrontendPort: 5173,
  nextConvexPort: 3210,
  copyPatterns: [
    ".env.local",
    ".env.development",
    ".env.development.local"
  ],
  dockerHostIp: "172.17.0.1",
  devDomain: "",
  traefikConfigDir: "/infra/traefik/dynamic",
  allocations: {}
};
function ensurezdevDirs() {
  if (!existsSync(ZEBU_HOME)) {
    mkdirSync(ZEBU_HOME, { recursive: true });
  }
  if (!existsSync(WORKTREES_DIR)) {
    mkdirSync(WORKTREES_DIR, { recursive: true });
  }
  if (!existsSync(SEEDS_DIR)) {
    mkdirSync(SEEDS_DIR, { recursive: true });
  }
}
function loadConfig() {
  ensurezdevDirs();
  if (!existsSync(CONFIG_PATH)) {
    saveConfig(DEFAULT_CONFIG);
    return DEFAULT_CONFIG;
  }
  try {
    const data = readFileSync(CONFIG_PATH, "utf-8");
    return { ...DEFAULT_CONFIG, ...JSON.parse(data) };
  } catch {
    return DEFAULT_CONFIG;
  }
}
function saveConfig(config) {
  ensurezdevDirs();
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}
function allocatePorts(config, includeConvex = true) {
  const frontend = config.nextFrontendPort;
  config.nextFrontendPort = frontend + 1;
  let convex = 0;
  if (includeConvex) {
    convex = config.nextConvexPort;
    config.nextConvexPort = convex + 1;
  }
  return { frontend, convex };
}
function getWorktreePath(name) {
  return join(WORKTREES_DIR, name);
}
function getSeedPath(projectName) {
  return join(SEEDS_DIR, `${projectName}.zip`);
}

// src/utils.ts
function run(command, args, options) {
  const result = spawnSync(command, args, {
    encoding: "utf-8",
    ...options
  });
  return {
    success: result.status === 0,
    stdout: result.stdout || "",
    stderr: result.stderr || "",
    code: result.status
  };
}
function runBackground(command, args, options) {
  const child = spawn(command, args, {
    detached: true,
    stdio: "ignore",
    ...options
  });
  child.unref();
  return child.pid;
}
function isGitRepo(path) {
  return existsSync2(resolve(path, ".git"));
}
function getRepoName(path) {
  const result = run("git", ["remote", "get-url", "origin"], { cwd: path });
  if (result.success) {
    const url = result.stdout.trim();
    const match = url.match(/\/([^\/]+?)(\.git)?$/);
    if (match)
      return match[1];
  }
  return basename(resolve(path));
}
function gitFetch(repoPath) {
  const result = run("git", ["fetch", "origin"], { cwd: repoPath });
  return result.success;
}
function createWorktree(repoPath, worktreePath, branch, baseBranch = "origin/main") {
  const result = run("git", ["worktree", "add", worktreePath, "-b", branch, baseBranch], { cwd: repoPath });
  if (!result.success) {
    return { success: false, error: result.stderr };
  }
  return { success: true };
}
function removeWorktree(repoPath, worktreePath) {
  const result = run("git", ["worktree", "remove", worktreePath, "--force"], {
    cwd: repoPath
  });
  if (!result.success) {
    return { success: false, error: result.stderr };
  }
  run("git", ["worktree", "prune"], { cwd: repoPath });
  return { success: true };
}
function traefikAddRoute(name, port) {
  const config = loadConfig();
  const configPath = `${config.traefikConfigDir}/${name}.yml`;
  const subdomain = name;
  const traefikConfig = `# zdev auto-generated config for ${name}
http:
  routers:
    ${name}:
      rule: "Host(\`${subdomain}.${config.devDomain}\`)"
      entrypoints:
        - websecure
      service: ${name}
      tls:
        certResolver: myresolver

  services:
    ${name}:
      loadBalancer:
        servers:
          - url: "http://${config.dockerHostIp}:${port}"
`;
  try {
    writeFileSync2(configPath, traefikConfig);
    return true;
  } catch {
    return false;
  }
}
function traefikRemoveRoute(name) {
  const zdevConfig = loadConfig();
  const configPath = `${zdevConfig.traefikConfigDir}/${name}.yml`;
  try {
    if (existsSync2(configPath)) {
      unlinkSync(configPath);
    }
    return true;
  } catch {
    return false;
  }
}
function getTraefikStatus() {
  const config = loadConfig();
  if (!config.devDomain) {
    return { running: false, devDomain: undefined };
  }
  const configDirExists = existsSync2(config.traefikConfigDir);
  return {
    running: configDirExists,
    baseUrl: configDirExists ? `https://*.${config.devDomain}` : undefined,
    devDomain: config.devDomain
  };
}
function killProcess(pid) {
  try {
    process.kill(pid, "SIGTERM");
    return true;
  } catch {
    return false;
  }
}
function isProcessRunning(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

// src/commands/create.ts
var ZEBU_INDEX_PAGE = `import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        color: '#e8e8e8',
        padding: '2rem',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Glowing orbs */}
      <div style={{
        position: 'absolute',
        top: '10%',
        left: '15%',
        width: '300px',
        height: '300px',
        background: 'radial-gradient(circle, rgba(99, 102, 241, 0.3) 0%, transparent 70%)',
        borderRadius: '50%',
        filter: 'blur(40px)',
      }} />
      <div style={{
        position: 'absolute',
        bottom: '20%',
        right: '10%',
        width: '400px',
        height: '400px',
        background: 'radial-gradient(circle, rgba(16, 185, 129, 0.25) 0%, transparent 70%)',
        borderRadius: '50%',
        filter: 'blur(50px)',
      }} />
      
      <div style={{ fontSize: '7rem', marginBottom: '1.5rem', zIndex: 1 }}>
        \uD83D\uDC02
      </div>
      <h1
        style={{
          fontSize: '3.5rem',
          fontWeight: 800,
          margin: 0,
          background: 'linear-gradient(90deg, #818cf8, #34d399)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          zIndex: 1,
        }}
      >
        Ready to build
      </h1>
      <p
        style={{
          fontSize: '1.25rem',
          color: 'rgba(255,255,255,0.6)',
          marginTop: '1.5rem',
          textAlign: 'center',
          zIndex: 1,
          maxWidth: '500px',
          lineHeight: 1.6,
        }}
      >
        Your TanStack Start app is ready.
        <br />
        Edit <code style={{ 
          color: '#818cf8', 
          background: 'rgba(129, 140, 248, 0.1)', 
          padding: '0.2rem 0.6rem', 
          borderRadius: '6px',
          border: '1px solid rgba(129, 140, 248, 0.2)',
        }}>src/routes/index.tsx</code> to get started.
      </p>
    </div>
  )
}
`;
var CONVEX_PROVIDER = `import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ReactNode } from "react";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}
`;
var ROUTER = `import { createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

export function getRouter() {
  const router = createRouter({
    routeTree,
    defaultPreload: 'intent',
    scrollRestoration: true,
  })
  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
`;
var ROOT_ROUTE = `/// <reference types="vite/client" />
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
} from '@tanstack/react-router'
import * as React from 'react'
import { Agentation } from 'agentation'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
    ],
  }),
  component: RootDocument,
})

function RootDocument() {
  return (
    <html>
      <head>
        <HeadContent />
      </head>
      <body>
        <Outlet />
        {import.meta.env.DEV && <Agentation />}
        <Scripts />
      </body>
    </html>
  )
}
`;
var SETUP_SCRIPT = `#!/bin/bash
# .zdev/setup.sh - Runs after worktree creation
# Edit this to customize your setup (change package manager, add commands, etc.)

set -e

# Install dependencies
bun install

# Add any other setup commands below:
# bunx prisma generate
# cp ../.env.local .
`;
async function create(projectName, options = {}) {
  const targetPath = resolve2(projectName);
  if (existsSync3(targetPath)) {
    console.error(`❌ Directory already exists: ${targetPath}`);
    process.exit(1);
  }
  console.log(`\uD83D\uDC02 Creating new project: ${projectName}`);
  console.log(`   Convex: ${options.convex ? "yes" : "no"}`);
  console.log(`   Structure: ${options.flat ? "flat" : "monorepo"}`);
  console.log(`
\uD83D\uDCE5 Cloning TanStack Start template...`);
  const cloneResult = run("npx", [
    "-y",
    "gitpick",
    "TanStack/router/tree/main/examples/react/start-basic",
    projectName
  ]);
  if (!cloneResult.success) {
    console.error(`❌ Failed to clone template: ${cloneResult.stderr}`);
    process.exit(1);
  }
  console.log(`   Template cloned`);
  let webPath;
  if (options.flat) {
    webPath = targetPath;
  } else {
    console.log(`
\uD83D\uDCC1 Setting up monorepo structure...`);
    const webDir = join2(targetPath, "web");
    const tempDir = join2(targetPath, "_temp_web");
    mkdirSync2(tempDir, { recursive: true });
    const files = readdirSync(targetPath);
    for (const file of files) {
      if (file !== "_temp_web") {
        renameSync(join2(targetPath, file), join2(tempDir, file));
      }
    }
    renameSync(tempDir, webDir);
    webPath = webDir;
    const rootPackageJson = {
      name: projectName,
      private: true,
      workspaces: ["web"],
      scripts: {
        dev: "cd web && bun dev",
        build: "cd web && bun run build"
      }
    };
    writeFileSync3(join2(targetPath, "package.json"), JSON.stringify(rootPackageJson, null, 2));
    console.log(`   Created web/ subdirectory`);
  }
  console.log(`
\uD83E\uDDF9 Cleaning up demo files...`);
  const srcDir = join2(webPath, "src");
  const routesDir = join2(srcDir, "routes");
  if (existsSync3(routesDir)) {
    rmSync(routesDir, { recursive: true, force: true });
    mkdirSync2(routesDir, { recursive: true });
  }
  const componentsDir = join2(srcDir, "components");
  const utilsDir = join2(srcDir, "utils");
  const stylesDir = join2(srcDir, "styles");
  if (existsSync3(componentsDir)) {
    rmSync(componentsDir, { recursive: true, force: true });
  }
  if (existsSync3(utilsDir)) {
    rmSync(utilsDir, { recursive: true, force: true });
  }
  if (existsSync3(stylesDir)) {
    rmSync(stylesDir, { recursive: true, force: true });
  }
  const routeTreePath = join2(srcDir, "routeTree.gen.ts");
  if (existsSync3(routeTreePath)) {
    rmSync(routeTreePath);
  }
  const appDir = join2(webPath, "app");
  if (existsSync3(appDir)) {
    rmSync(appDir, { recursive: true, force: true });
  }
  writeFileSync3(join2(srcDir, "router.tsx"), ROUTER);
  writeFileSync3(join2(routesDir, "__root.tsx"), ROOT_ROUTE);
  writeFileSync3(join2(routesDir, "index.tsx"), ZEBU_INDEX_PAGE);
  console.log(`   Cleaned demo files, added index route`);
  const pkgPath = join2(webPath, "package.json");
  if (existsSync3(pkgPath)) {
    const pkg = JSON.parse(readFileSync2(pkgPath, "utf-8"));
    pkg.name = options.flat ? projectName : `${projectName}-web`;
    pkg.dependencies = pkg.dependencies || {};
    pkg.dependencies["agentation"] = "latest";
    writeFileSync3(pkgPath, JSON.stringify(pkg, null, 2));
  }
  if (options.convex) {
    console.log(`
\uD83D\uDD27 Setting up Convex...`);
    const addResult = run("bun", ["add", "convex", "convex-react"], { cwd: webPath });
    if (!addResult.success) {
      console.error(`   Failed to add Convex deps: ${addResult.stderr}`);
    } else {
      console.log(`   Added convex dependencies`);
    }
    const initResult = run("bunx", ["convex", "init"], { cwd: webPath });
    if (!initResult.success) {
      console.log(`   Note: Run 'bunx convex dev' to complete Convex setup`);
    } else {
      console.log(`   Initialized Convex`);
    }
    const componentsDir2 = join2(webPath, "app", "components");
    mkdirSync2(componentsDir2, { recursive: true });
    writeFileSync3(join2(componentsDir2, "ConvexClientProvider.tsx"), CONVEX_PROVIDER);
    console.log(`   Created ConvexClientProvider`);
    writeFileSync3(join2(webPath, ".env.local.example"), `VITE_CONVEX_URL=your_convex_url_here
`);
    console.log(`   Created .env.local.example`);
    console.log(`
   ⚠️  To complete Convex setup:`);
    console.log(`      1. cd ${options.flat ? projectName : projectName + "/web"}`);
    console.log(`      2. bunx convex dev  (select/create project)`);
    console.log(`      3. Wrap your app with <ConvexClientProvider> in app/root.tsx`);
  }
  console.log(`
\uD83D\uDCDC Creating setup script...`);
  const zdevDir = join2(targetPath, ".zdev");
  mkdirSync2(zdevDir, { recursive: true });
  const setupScriptPath = join2(zdevDir, "setup.sh");
  writeFileSync3(setupScriptPath, SETUP_SCRIPT, { mode: 493 });
  console.log(`   Created .zdev/setup.sh`);
  console.log(`
\uD83D\uDCE6 Installing dependencies...`);
  const installResult = run("bun", ["install"], { cwd: webPath });
  if (!installResult.success) {
    console.error(`   Failed to install: ${installResult.stderr}`);
  } else {
    console.log(`   Dependencies installed`);
  }
  console.log(`
\uD83D\uDCDA Initializing git...`);
  run("git", ["init"], { cwd: targetPath });
  run("git", ["add", "."], { cwd: targetPath });
  run("git", ["commit", "-m", "Initial commit from zdev create"], { cwd: targetPath });
  console.log(`   Git initialized`);
  console.log(`
${"-".repeat(50)}`);
  console.log(`✅ Project "${projectName}" created!
`);
  console.log(`\uD83D\uDCC1 Location: ${targetPath}`);
  console.log(`
\uD83D\uDCDD Next steps:`);
  console.log(`   cd ${projectName}`);
  if (!options.flat) {
    console.log(`   cd web`);
  }
  if (options.convex) {
    console.log(`   bunx convex dev    # Setup Convex project`);
  }
  console.log(`   bun dev            # Start dev server`);
  console.log(`${"-".repeat(50)}`);
}

// src/commands/init.ts
import { existsSync as existsSync4, mkdirSync as mkdirSync3, writeFileSync as writeFileSync4, readFileSync as readFileSync3 } from "fs";
import { resolve as resolve3 } from "path";
async function init(projectPath = ".", options = {}) {
  const fullPath = resolve3(projectPath);
  if (!existsSync4(fullPath)) {
    console.error(`❌ Path does not exist: ${fullPath}`);
    process.exit(1);
  }
  if (!isGitRepo(fullPath)) {
    console.error(`❌ Not a git repository: ${fullPath}`);
    process.exit(1);
  }
  const repoName = getRepoName(fullPath);
  console.log(`\uD83D\uDC02 Initializing zdev for: ${repoName}`);
  const zdevDir = resolve3(fullPath, ".zdev");
  if (!existsSync4(zdevDir)) {
    mkdirSync3(zdevDir, { recursive: true });
    console.log(`   Created ${zdevDir}`);
  }
  const projectConfig = {
    name: repoName,
    path: fullPath,
    initialized: new Date().toISOString()
  };
  const configPath = resolve3(zdevDir, "project.json");
  writeFileSync4(configPath, JSON.stringify(projectConfig, null, 2));
  console.log(`   Created project config`);
  const gitignorePath = resolve3(fullPath, ".gitignore");
  if (existsSync4(gitignorePath)) {
    const content = readFileSync3(gitignorePath, "utf-8");
    if (!content.includes(".zdev")) {
      writeFileSync4(gitignorePath, content + `
.zdev/
`);
      console.log(`   Added .zdev/ to .gitignore`);
    }
  }
  if (options.seed) {
    console.log(`
\uD83D\uDCE6 Creating seed data...`);
    const convexDir = resolve3(fullPath, "convex");
    if (!existsSync4(convexDir)) {
      console.log(`   No convex/ directory found, skipping seed`);
    } else {
      const seedPath = getSeedPath(repoName);
      const result = run("bunx", ["convex", "export", "--path", seedPath], {
        cwd: fullPath
      });
      if (result.success) {
        console.log(`   Seed saved to: ${seedPath}`);
      } else {
        console.error(`   Failed to create seed: ${result.stderr}`);
      }
    }
  }
  console.log(`
✅ zdev initialized for ${repoName}`);
  console.log(`
Next steps:`);
  console.log(`   zdev start <feature-name>   Start working on a feature`);
  console.log(`   zdev list                   List active worktrees`);
}

// src/commands/start.ts
import { existsSync as existsSync5, readFileSync as readFileSync4, writeFileSync as writeFileSync5 } from "fs";
import { resolve as resolve4, basename as basename3, join as join3 } from "path";
function detectWebDir(worktreePath) {
  const commonDirs = ["web", "frontend", "app", "client", "packages/web", "apps/web"];
  for (const dir of commonDirs) {
    const packagePath = join3(worktreePath, dir, "package.json");
    if (existsSync5(packagePath)) {
      return dir;
    }
  }
  if (existsSync5(join3(worktreePath, "package.json"))) {
    return ".";
  }
  return "web";
}
async function start(featureName, projectPath = ".", options = {}) {
  const fullPath = resolve4(projectPath);
  if (!existsSync5(fullPath)) {
    console.error(`❌ Path does not exist: ${fullPath}`);
    process.exit(1);
  }
  if (!isGitRepo(fullPath)) {
    console.error(`❌ Not a git repository: ${fullPath}`);
    process.exit(1);
  }
  const repoName = getRepoName(fullPath);
  const worktreeName = `${repoName}-${featureName}`;
  const worktreePath = getWorktreePath(worktreeName);
  const branchName = `feature/${featureName}`;
  let baseBranch = options.baseBranch;
  if (!baseBranch) {
    const candidates = ["origin/main", "origin/master", "main", "master"];
    for (const candidate of candidates) {
      const check = run("git", ["rev-parse", "--verify", candidate], { cwd: fullPath });
      if (check.success) {
        baseBranch = candidate;
        break;
      }
    }
    if (!baseBranch) {
      console.error(`❌ Could not detect base branch. Use --base-branch to specify.`);
      process.exit(1);
    }
  }
  console.log(`\uD83D\uDC02 Starting feature: ${featureName}`);
  console.log(`   Project: ${repoName}`);
  console.log(`   Branch: ${branchName}`);
  const config = loadConfig();
  if (config.allocations[worktreeName]) {
    console.error(`
❌ Feature "${featureName}" already exists for ${repoName}`);
    console.log(`   Run: zdev stop ${featureName} --project ${fullPath}`);
    process.exit(1);
  }
  console.log(`
\uD83D\uDCE5 Fetching latest from origin...`);
  if (!gitFetch(fullPath)) {
    console.error(`   Failed to fetch, continuing anyway...`);
  }
  console.log(`
\uD83C\uDF33 Creating worktree...`);
  if (existsSync5(worktreePath)) {
    console.error(`   Worktree path already exists: ${worktreePath}`);
    process.exit(1);
  }
  const worktreeResult = createWorktree(fullPath, worktreePath, branchName, baseBranch);
  if (!worktreeResult.success) {
    console.error(`   Failed to create worktree: ${worktreeResult.error}`);
    process.exit(1);
  }
  console.log(`   Created: ${worktreePath}`);
  const webDir = options.webDir || detectWebDir(worktreePath);
  const webPath = webDir === "." ? worktreePath : join3(worktreePath, webDir);
  console.log(`
\uD83D\uDCC1 Web directory: ${webDir === "." ? "(root)" : webDir}`);
  if (config.copyPatterns && config.copyPatterns.length > 0) {
    console.log(`
\uD83D\uDCCB Copying config files...`);
    const mainWebPath = webDir === "." ? fullPath : join3(fullPath, webDir);
    for (const pattern of config.copyPatterns) {
      const srcPath = join3(mainWebPath, pattern);
      const destPath = join3(webPath, pattern);
      if (existsSync5(srcPath) && !existsSync5(destPath)) {
        try {
          const content = readFileSync4(srcPath);
          writeFileSync5(destPath, content);
          console.log(`   Copied ${pattern}`);
        } catch (e) {
          console.log(`   Could not copy ${pattern}`);
        }
      }
    }
  }
  const setupScriptPath = join3(worktreePath, ".zdev", "setup.sh");
  if (existsSync5(setupScriptPath)) {
    console.log(`
\uD83D\uDCE6 Running setup script...`);
    const setupResult = run("bash", [setupScriptPath], { cwd: webPath });
    if (!setupResult.success) {
      console.error(`   Setup script failed: ${setupResult.stderr}`);
    } else {
      console.log(`   Setup complete`);
    }
  } else {
    console.log(`
⚠️  No .zdev/setup.sh found, skipping setup`);
    console.log(`   Create one in your project to automate dependency installation`);
  }
  const hasConvex = existsSync5(join3(webPath, "convex")) || existsSync5(join3(worktreePath, "convex"));
  const seedPath = getSeedPath(repoName);
  if (options.seed && hasConvex && existsSync5(seedPath)) {
    console.log(`
\uD83C\uDF31 Importing seed data...`);
    const seedResult = run("bunx", ["convex", "import", seedPath], {
      cwd: webPath
    });
    if (seedResult.success) {
      console.log(`   Seed data imported`);
    } else {
      console.error(`   Failed to import seed: ${seedResult.stderr}`);
    }
  }
  const ports = options.port ? { frontend: options.port, convex: hasConvex ? options.port + 100 : 0 } : allocatePorts(config, hasConvex);
  console.log(`
\uD83D\uDD0C Allocated ports:`);
  console.log(`   Frontend: ${ports.frontend}`);
  if (hasConvex) {
    console.log(`   Convex: ${ports.convex}`);
  }
  let convexPid;
  if (hasConvex) {
    console.log(`
\uD83D\uDE80 Starting Convex dev server...`);
    convexPid = runBackground("bunx", ["convex", "dev", "--tail-logs", "disable"], { cwd: webPath });
    console.log(`   Convex PID: ${convexPid}`);
    await new Promise((resolve5) => setTimeout(resolve5, 2000));
  }
  const viteConfigTsPath = join3(webPath, "vite.config.ts");
  const viteConfigJsPath = join3(webPath, "vite.config.js");
  const viteConfigPath = existsSync5(viteConfigTsPath) ? viteConfigTsPath : existsSync5(viteConfigJsPath) ? viteConfigJsPath : null;
  if (viteConfigPath) {
    try {
      let viteConfig = readFileSync4(viteConfigPath, "utf-8");
      if (!viteConfig.includes("allowedHosts")) {
        let patched = false;
        if (viteConfig.includes("server:") || viteConfig.includes("server :")) {
          viteConfig = viteConfig.replace(/server\s*:\s*\{/, `server: {
    allowedHosts: true,`);
          patched = true;
        } else if (viteConfig.includes("defineConfig({")) {
          viteConfig = viteConfig.replace(/defineConfig\(\{/, `defineConfig({
  server: {
    allowedHosts: true,
  },`);
          patched = true;
        }
        if (patched) {
          writeFileSync5(viteConfigPath, viteConfig);
          console.log(`   Patched ${basename3(viteConfigPath)} for external access`);
          run("git", ["update-index", "--skip-worktree", basename3(viteConfigPath)], { cwd: webPath });
        }
      }
    } catch (e) {
      console.log(`   Could not patch vite config (non-critical)`);
    }
  }
  console.log(`
\uD83C\uDF10 Starting frontend dev server...`);
  const frontendPid = runBackground("bun", ["dev", "--port", String(ports.frontend), "--host", "0.0.0.0"], { cwd: webPath });
  console.log(`   Frontend PID: ${frontendPid}`);
  let routePath = "";
  let publicUrl = "";
  if (!options.local) {
    const traefikStatus = getTraefikStatus();
    if (traefikStatus.running && traefikStatus.devDomain) {
      routePath = worktreeName;
      console.log(`
\uD83D\uDD17 Setting up Traefik route...`);
      await new Promise((resolve5) => setTimeout(resolve5, 2000));
      if (traefikAddRoute(worktreeName, ports.frontend)) {
        publicUrl = `https://${worktreeName}.${traefikStatus.devDomain}`;
        console.log(`   Public URL: ${publicUrl}`);
      } else {
        console.error(`   Failed to setup Traefik route`);
      }
    } else {
      console.log(`
⚠️  Traefik not configured or devDomain not set, skipping public URL`);
      console.log(`   Run: zdev config --set devDomain=dev.yourdomain.com`);
    }
  }
  const allocation = {
    project: repoName,
    projectPath: fullPath,
    branch: branchName,
    webDir,
    frontendPort: ports.frontend,
    convexPort: ports.convex,
    funnelPath: routePath,
    pids: {
      frontend: frontendPid,
      convex: convexPid
    },
    started: new Date().toISOString()
  };
  config.allocations[worktreeName] = allocation;
  saveConfig(config);
  console.log(`
${"-".repeat(50)}`);
  console.log(`✅ Feature "${featureName}" is ready!
`);
  console.log(`\uD83D\uDCC1 Worktree: ${worktreePath}`);
  console.log(`\uD83C\uDF10 Local:    http://localhost:${ports.frontend}`);
  if (publicUrl) {
    console.log(`\uD83D\uDD17 Public:   ${publicUrl}`);
  }
  console.log(`
\uD83D\uDCDD Commands:`);
  console.log(`   cd ${worktreePath}`);
  console.log(`   zdev stop ${featureName} --project ${fullPath}`);
  console.log(`${"-".repeat(50)}`);
}

// src/commands/stop.ts
import { resolve as resolve5 } from "path";
async function stop(featureName, options = {}) {
  const config = loadConfig();
  let worktreeName;
  let allocation;
  if (options.project) {
    const projectPath = resolve5(options.project);
    const repoName = isGitRepo(projectPath) ? getRepoName(projectPath) : options.project;
    worktreeName = `${repoName}-${featureName}`;
    allocation = config.allocations[worktreeName];
  } else {
    for (const [name, alloc] of Object.entries(config.allocations)) {
      if (name.endsWith(`-${featureName}`)) {
        worktreeName = name;
        allocation = alloc;
        break;
      }
    }
  }
  if (!worktreeName || !allocation) {
    console.error(`❌ Feature "${featureName}" not found`);
    console.log(`
Run 'zdev list' to see active features`);
    process.exit(1);
  }
  console.log(`\uD83D\uDC02 Stopping feature: ${featureName}`);
  console.log(`   Project: ${allocation.project}`);
  if (allocation.pids.frontend && isProcessRunning(allocation.pids.frontend)) {
    console.log(`
\uD83D\uDED1 Stopping frontend (PID: ${allocation.pids.frontend})...`);
    if (killProcess(allocation.pids.frontend)) {
      console.log(`   Frontend stopped`);
    } else {
      console.error(`   Failed to stop frontend`);
    }
  }
  if (allocation.pids.convex && isProcessRunning(allocation.pids.convex)) {
    console.log(`
\uD83D\uDED1 Stopping Convex (PID: ${allocation.pids.convex})...`);
    if (killProcess(allocation.pids.convex)) {
      console.log(`   Convex stopped`);
    } else {
      console.error(`   Failed to stop Convex`);
    }
  }
  if (allocation.funnelPath) {
    console.log(`
\uD83D\uDD17 Removing Traefik route...`);
    if (traefikRemoveRoute(allocation.funnelPath)) {
      console.log(`   Route removed`);
    } else {
      console.error(`   Failed to remove route (may already be removed)`);
    }
  }
  delete config.allocations[worktreeName];
  saveConfig(config);
  const worktreePath = getWorktreePath(worktreeName);
  if (options.keep) {
    console.log(`
✅ Feature "${featureName}" stopped (worktree kept)`);
    console.log(`   Worktree: ${worktreePath}`);
    console.log(`
   To remove worktree: zdev clean ${featureName}`);
  } else {
    console.log(`
✅ Feature "${featureName}" stopped`);
    console.log(`
   Worktree still exists at: ${worktreePath}`);
    console.log(`   To remove: zdev clean ${featureName} --project ${allocation.projectPath}`);
  }
}

// src/commands/list.ts
import { existsSync as existsSync6 } from "fs";
async function list(options = {}) {
  const config = loadConfig();
  const allocations = Object.entries(config.allocations);
  if (options.json) {
    console.log(JSON.stringify(config, null, 2));
    return;
  }
  console.log(`\uD83D\uDC02 zdev Status
`);
  console.log(`\uD83D\uDCC1 Home: ${ZEBU_HOME}`);
  console.log(`\uD83D\uDCC1 Worktrees: ${WORKTREES_DIR}`);
  const traefikStatus = getTraefikStatus();
  if (traefikStatus.running) {
    console.log(`\uD83D\uDD17 Traefik: running (*.${traefikStatus.devDomain || "dev.example.com"})`);
  } else {
    console.log(`\uD83D\uDD17 Traefik: not running`);
  }
  console.log(`
${"-".repeat(60)}`);
  if (allocations.length === 0) {
    console.log(`
No active features.
`);
    console.log(`Start one with: zdev start <feature-name> --project <path>`);
    return;
  }
  console.log(`
\uD83D\uDCCB Active Features (${allocations.length}):
`);
  for (const [name, alloc] of allocations) {
    const worktreePath = getWorktreePath(name);
    const worktreeExists = existsSync6(worktreePath);
    const frontendRunning = alloc.pids.frontend ? isProcessRunning(alloc.pids.frontend) : false;
    const convexRunning = alloc.pids.convex ? isProcessRunning(alloc.pids.convex) : false;
    const statusEmoji = frontendRunning && convexRunning ? "\uD83D\uDFE2" : frontendRunning || convexRunning ? "\uD83D\uDFE1" : "\uD83D\uDD34";
    console.log(`${statusEmoji} ${name}`);
    console.log(`   Project:  ${alloc.project}`);
    console.log(`   Branch:   ${alloc.branch}`);
    console.log(`   Path:     ${worktreePath} ${worktreeExists ? "" : "(missing)"}`);
    console.log(`   Local:    http://localhost:${alloc.frontendPort}`);
    if (alloc.funnelPath && traefikStatus.devDomain) {
      console.log(`   Public:   https://${alloc.funnelPath}.${traefikStatus.devDomain}`);
    }
    console.log(`   Frontend: ${frontendRunning ? `running (PID: ${alloc.pids.frontend})` : "stopped"}`);
    console.log(`   Convex:   ${convexRunning ? `running (PID: ${alloc.pids.convex})` : "stopped"}`);
    console.log(`   Started:  ${new Date(alloc.started).toLocaleString()}`);
    console.log();
  }
  console.log(`${"-".repeat(60)}`);
  console.log(`
Commands:`);
  console.log(`   zdev stop <feature>    Stop servers for a feature`);
  console.log(`   zdev clean <feature>   Remove worktree after merge`);
}

// src/commands/clean.ts
import { existsSync as existsSync7, rmSync as rmSync2 } from "fs";
import { resolve as resolve6 } from "path";
async function clean(featureName, options = {}) {
  const config = loadConfig();
  let worktreeName;
  let allocation;
  let projectPath;
  if (options.project) {
    projectPath = resolve6(options.project);
    const repoName = isGitRepo(projectPath) ? getRepoName(projectPath) : options.project;
    worktreeName = `${repoName}-${featureName}`;
    allocation = config.allocations[worktreeName];
  } else {
    for (const [name, alloc] of Object.entries(config.allocations)) {
      if (name.endsWith(`-${featureName}`)) {
        worktreeName = name;
        allocation = alloc;
        projectPath = alloc.projectPath;
        break;
      }
    }
    if (!worktreeName) {
      const entries = Object.keys(config.allocations);
      console.error(`❌ Feature "${featureName}" not found in active allocations`);
      if (entries.length > 0) {
        console.log(`
Active features:`);
        entries.forEach((e) => console.log(`   - ${e}`));
      }
      process.exit(1);
    }
  }
  const worktreePath = getWorktreePath(worktreeName);
  console.log(`\uD83D\uDC02 Cleaning feature: ${featureName}`);
  if (allocation) {
    if (allocation.pids.frontend && isProcessRunning(allocation.pids.frontend)) {
      console.log(`
\uD83D\uDED1 Stopping frontend...`);
      killProcess(allocation.pids.frontend);
    }
    if (allocation.pids.convex && isProcessRunning(allocation.pids.convex)) {
      console.log(`\uD83D\uDED1 Stopping Convex...`);
      killProcess(allocation.pids.convex);
    }
    if (allocation.funnelPath) {
      console.log(`\uD83D\uDD17 Removing Traefik route...`);
      traefikRemoveRoute(allocation.funnelPath);
    }
    projectPath = allocation.projectPath;
  }
  if (existsSync7(worktreePath)) {
    console.log(`
\uD83D\uDDD1️  Removing worktree...`);
    if (projectPath && isGitRepo(projectPath)) {
      const result = removeWorktree(projectPath, worktreePath);
      if (!result.success) {
        if (options.force) {
          console.log(`   Git worktree remove failed, force removing directory...`);
          rmSync2(worktreePath, { recursive: true, force: true });
        } else {
          console.error(`   Failed to remove worktree: ${result.error}`);
          console.log(`   Use --force to force remove`);
          process.exit(1);
        }
      }
    } else if (options.force) {
      rmSync2(worktreePath, { recursive: true, force: true });
    } else {
      console.error(`   Cannot remove worktree: project path unknown`);
      console.log(`   Use --force to force remove, or specify --project`);
      process.exit(1);
    }
    console.log(`   Worktree removed`);
  } else {
    console.log(`
   Worktree already removed`);
  }
  if (worktreeName && config.allocations[worktreeName]) {
    delete config.allocations[worktreeName];
    saveConfig(config);
  }
  console.log(`
✅ Feature "${featureName}" cleaned up`);
}

// src/commands/seed.ts
import { existsSync as existsSync8 } from "fs";
import { resolve as resolve7 } from "path";
async function seedExport(projectPath = ".", options = {}) {
  const fullPath = resolve7(projectPath);
  if (!existsSync8(fullPath)) {
    console.error(`❌ Path does not exist: ${fullPath}`);
    process.exit(1);
  }
  if (!isGitRepo(fullPath)) {
    console.error(`❌ Not a git repository: ${fullPath}`);
    process.exit(1);
  }
  const repoName = getRepoName(fullPath);
  const seedPath = getSeedPath(repoName);
  console.log(`\uD83D\uDC02 Exporting seed data for: ${repoName}`);
  ensurezdevDirs();
  const result = run("bunx", ["convex", "export", "--path", seedPath], {
    cwd: fullPath
  });
  if (result.success) {
    console.log(`
✅ Seed exported to: ${seedPath}`);
  } else {
    console.error(`
❌ Failed to export seed:`);
    console.error(result.stderr);
    process.exit(1);
  }
}
async function seedImport(projectPath = ".", options = {}) {
  const fullPath = resolve7(projectPath);
  if (!existsSync8(fullPath)) {
    console.error(`❌ Path does not exist: ${fullPath}`);
    process.exit(1);
  }
  let repoName;
  const projectConfigPath = resolve7(fullPath, ".zdev", "project.json");
  if (existsSync8(projectConfigPath)) {
    try {
      const config = JSON.parse(await Bun.file(projectConfigPath).text());
      repoName = config.name;
    } catch {
      repoName = getRepoName(fullPath);
    }
  } else if (isGitRepo(fullPath)) {
    repoName = getRepoName(fullPath);
  } else {
    console.error(`❌ Cannot determine project name`);
    process.exit(1);
  }
  const seedPath = getSeedPath(repoName);
  if (!existsSync8(seedPath)) {
    console.error(`❌ No seed found for ${repoName}`);
    console.log(`   Expected: ${seedPath}`);
    console.log(`
   Create one with: zdev seed export --project <main-repo-path>`);
    process.exit(1);
  }
  console.log(`\uD83D\uDC02 Importing seed data for: ${repoName}`);
  console.log(`   From: ${seedPath}`);
  const result = run("bunx", ["convex", "import", "--replace", seedPath], {
    cwd: fullPath
  });
  if (result.success) {
    console.log(`
✅ Seed imported successfully`);
  } else {
    console.error(`
❌ Failed to import seed:`);
    console.error(result.stderr);
    process.exit(1);
  }
}

// src/commands/config.ts
async function configCmd(options = {}) {
  const config = loadConfig();
  if (options.set) {
    const [key, ...valueParts] = options.set.split("=");
    const value = valueParts.join("=");
    if (!value) {
      console.error(`Usage: zdev config --set key=value`);
      console.log(`
Configurable keys:`);
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
  if (options.list || !options.add && !options.remove) {
    console.log(`\uD83D\uDC02 zdev Configuration
`);
    console.log(`\uD83D\uDCC1 Config file: ${CONFIG_PATH}`);
    console.log(`
\uD83C\uDF10 Traefik / Public URLs:`);
    console.log(`   Dev domain:     ${config.devDomain}`);
    console.log(`   Docker host IP: ${config.dockerHostIp}`);
    console.log(`   Config dir:     ${config.traefikConfigDir}`);
    console.log(`
\uD83D\uDCCB Copy patterns (files auto-copied to worktrees):`);
    if (config.copyPatterns && config.copyPatterns.length > 0) {
      for (const pattern of config.copyPatterns) {
        console.log(`   - ${pattern}`);
      }
    } else {
      console.log(`   (none)`);
    }
    console.log(`
\uD83D\uDD0C Port allocation:`);
    console.log(`   Next frontend port: ${config.nextFrontendPort}`);
    console.log(`   Next Convex port: ${config.nextConvexPort}`);
    console.log(`
Commands:`);
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

// src/index.ts
import { readFileSync as readFileSync5 } from "fs";
import { fileURLToPath } from "url";
import { dirname, join as join4 } from "path";
var __dirname2 = dirname(fileURLToPath(import.meta.url));
var pkg = JSON.parse(readFileSync5(join4(__dirname2, "..", "package.json"), "utf-8"));
var program2 = new Command;
program2.name("zdev").description(`\uD83D\uDC02 zdev v${pkg.version} - Multi-agent worktree development environment`).version(pkg.version);
program2.command("create <name>").description("Create a new TanStack Start project").option("--convex", "Add Convex backend integration").option("--flat", "Flat structure (no monorepo)").action(async (name, options) => {
  await create(name, {
    convex: options.convex,
    flat: options.flat
  });
});
program2.command("init [path]").description("Initialize zdev for a project").option("-s, --seed", "Create initial seed data from current Convex state").action(async (path, options) => {
  await init(path, options);
});
program2.command("start <feature>").description("Start working on a feature (creates worktree, starts servers)").option("-p, --project <path>", "Project path (default: current directory)", ".").option("--port <number>", "Frontend port (auto-allocated if not specified)", parseInt).option("--local", "Local only - skip public URL setup via Traefik").option("-s, --seed", "Import seed data into the new worktree").option("-b, --base-branch <branch>", "Base branch to create from", "origin/main").option("-w, --web-dir <dir>", "Subdirectory containing package.json (auto-detected if not specified)").action(async (feature, options) => {
  await start(feature, options.project, {
    port: options.port,
    local: options.local,
    seed: options.seed,
    baseBranch: options.baseBranch,
    webDir: options.webDir
  });
});
program2.command("stop <feature>").description("Stop servers for a feature").option("-p, --project <path>", "Project path (to disambiguate features)").option("-k, --keep", "Keep worktree, just stop servers").action(async (feature, options) => {
  await stop(feature, options);
});
program2.command("list").description("List active features and their status").option("--json", "Output as JSON").action(async (options) => {
  await list(options);
});
program2.command("clean <feature>").description("Remove a feature worktree (use after PR is merged)").option("-p, --project <path>", "Project path").option("-f, --force", "Force remove even if git worktree fails").action(async (feature, options) => {
  await clean(feature, options);
});
var seedCmd = program2.command("seed").description("Manage seed data for projects");
seedCmd.command("export [path]").description("Export current Convex data as seed").action(async (path) => {
  await seedExport(path);
});
seedCmd.command("import [path]").description("Import seed data into current worktree").action(async (path) => {
  await seedImport(path);
});
program2.command("config").description("View and manage zdev configuration").option("-a, --add <pattern>", "Add a file pattern to auto-copy").option("-r, --remove <pattern>", "Remove a file pattern").option("-s, --set <key=value>", "Set a config value (devDomain, dockerHostIp, traefikConfigDir)").option("-l, --list", "List current configuration").action(async (options) => {
  await configCmd(options);
});
program2.command("status").description("Show zdev status (alias for list)").action(async () => {
  await list({});
});
program2.parse();
