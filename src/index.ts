import path from 'path';
import signale from 'signale';
import chalk from 'chalk';
import { buildInstrument, watchInstrument } from './esbuild';
import { BuildLogger } from './logger';
import { MachConfig } from './types';

function configureEnvironment(conf: MachConfig) {
    process.env.CONFIG_PATH = process.env.CONFIG_PATH ?? path.join(process.cwd(), 'mach.config.json');
    process.env.BUNDLES_DIR = process.env.BUNDLES_DIR ?? path.join(process.cwd(), 'bundles');
    process.env.PACKAGES_DIR = process.env.PACKAGES_DIR ?? path.join(process.cwd(), conf.packagesDir);
    process.env.PACKAGE_NAME = process.env.PACKAGE_NAME ?? conf.packageName;
    process.env.OUTPUT_METAFILE = process.env.OUTPUT_METAFILE ?? false;
}

export async function machBuild(conf: MachConfig, filter?: RegExp) {
    configureEnvironment(conf);

    const instruments = conf.instruments.filter((instrument) => filter?.test(instrument.name) ?? true);

    signale.start(`Bundling ${instruments.length} instruments\n`);

    const startTime = performance.now();
    Promise.all(
        instruments.map(async (instrument) => {
            const result = await buildInstrument(instrument, new BuildLogger(instrument.name));
            result.rebuild?.dispose();
            return result;
        }),
    ).then((results) => {
        const stopTime = performance.now();
        signale.success(
            `Bundled ${results.filter((res) => res.errors.length === 0).length} instruments in`,
            chalk.greenBright(`${(stopTime - startTime).toFixed()}ms`),
            '\n',
        );
    });
}

export async function machWatch(conf: MachConfig, filter?: RegExp) {
    configureEnvironment(conf);

    const instruments = conf.instruments.filter((instrument) => filter?.test(instrument.name) ?? true);

    Promise.all(
        instruments.map((instrument) => watchInstrument(instrument, new BuildLogger(instrument.name))),
    ).then((results) => {
        if (results.some((res) => res.errors.length > 0)) {
            signale.error('Watch mode requires a build-able bundle to initialize');
            process.exit(1);
        }
        signale.watch('Watching for changes\n');
    });
}
