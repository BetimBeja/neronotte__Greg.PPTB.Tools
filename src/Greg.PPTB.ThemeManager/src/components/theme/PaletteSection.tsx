import { Button, Divider, Dropdown, Field, Option, Slider, Switch, Text, Tooltip, makeStyles, tokens } from '@fluentui/react-components';
import { ArrowResetRegular } from '@fluentui/react-icons';
import { PALETTE_SLOTS, type PaletteSlot } from '../../model/theme';
import { useThemeModel } from '../../state/ThemeContext';
import { usePortalMount } from '../../state/PortalMountContext';
import { THEME_PRESETS } from '../../model/defaults';
import { ColorField } from './ColorField';

const useStyles = makeStyles({
    section: {
        display: 'flex',
        flexDirection: 'column',
        gap: tokens.spacingVerticalS,
    },
    sectionHeader: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: tokens.spacingHorizontalS,
    },
    hint: {
        color: tokens.colorNeutralForeground3,
    },
    slots: {
        display: 'flex',
        flexDirection: 'column',
        gap: tokens.spacingVerticalS,
    },
});

/**
 * **Palette** group: seed colour, `lockPrimary`, `vibrancy`, `hueTorsion` and
 * the 16 slot overrides, grouped exactly as the documentation groups them
 * (docs/THEME_XML_REFERENCE.md §2, docs/IMPLEMENTATION_PLAN.md §5 Phase 2).
 */
export function PaletteSection() {
    const styles = useStyles();
    const mountNode = usePortalMount();
    const { model, dispatch, generatedPalette, resolvedPalette } = useThemeModel();
    const hasOverrides = Object.keys(model.paletteOverrides).length > 0;

    return (
        <div className={styles.section}>
            <Field label="Start from a preset" hint="Presets only seed the palette and the header colours — everything stays editable.">
                <Dropdown
                    mountNode={mountNode}
                    placeholder="Choose a preset"
                    selectedOptions={[]}
                    value=""
                    onOptionSelect={(_, data) => {
                        const preset = THEME_PRESETS.find((p) => p.id === data.optionValue);
                        if (preset) {
                            dispatch({ type: 'replace', model: preset.create() });
                        }
                    }}
                >
                    {THEME_PRESETS.map((preset) => (
                        <Option key={preset.id} value={preset.id} text={preset.label}>
                            {preset.label}
                        </Option>
                    ))}
                </Dropdown>
            </Field>

            <ColorField
                label="Base palette color"
                value={model.basePaletteColor}
                placeholder="#0F6CBD"
                hint="Seed colour the platform uses to generate the 16-slot palette."
                onChange={(value) => dispatch({ type: 'setBasePaletteColor', value })}
                onReset={() => dispatch({ type: 'setBasePaletteColor', value: undefined })}
            />

            <Switch
                label="Lock primary"
                checked={model.lockPrimary}
                onChange={(_, data) => dispatch({ type: 'setLockPrimary', value: data.checked })}
            />
            <Text size={100} className={styles.hint}>
                {model.lockPrimary
                    ? 'The seed colour is placed in the primary slot; contrast is not guaranteed.'
                    : 'The palette is optimised for accessibility; the seed colour may not appear in any slot.'}
            </Text>

            <Field label={`Vibrancy (${model.vibrancy})`} hint="Muteness/brightness of the palette, mostly the lighter colours.">
                <Slider min={-100} max={100} step={1} value={model.vibrancy} onChange={(_, data) => dispatch({ type: 'setVibrancy', value: data.value })} />
            </Field>

            <Field label={`Hue torsion (${model.hueTorsion})`} hint="Tint/shade/tone of the palette, mostly the lighter colours.">
                <Slider min={-100} max={100} step={1} value={model.hueTorsion} onChange={(_, data) => dispatch({ type: 'setHueTorsion', value: data.value })} />
            </Field>

            <Divider />

            <div className={styles.sectionHeader}>
                <Text weight="semibold">Palette slot overrides</Text>
                <Tooltip content="Clear every slot override" relationship="label" mountNode={mountNode}>
                    <Button appearance="subtle" size="small" icon={<ArrowResetRegular />} disabled={!hasOverrides} onClick={() => dispatch({ type: 'resetPaletteOverrides' })} />
                </Tooltip>
            </div>
            <Text size={100} className={styles.hint}>
                The generated ramp is an approximation of the platform generator. Override a slot to pin an exact colour.
            </Text>

            <div className={styles.slots}>
                {PALETTE_SLOTS.map((slot: PaletteSlot) => (
                    <ColorField
                        key={slot}
                        label={slot}
                        value={model.paletteOverrides[slot]}
                        placeholder={generatedPalette[slot]}
                        contrastAgainst={slot === 'primary' ? '#FFFFFF' : undefined}
                        onChange={(value) => dispatch({ type: 'setPaletteOverride', slot, value })}
                        onReset={() => dispatch({ type: 'setPaletteOverride', slot, value: undefined })}
                    />
                ))}
            </div>
            <Text size={100} className={styles.hint}>
                Resolved primary: {resolvedPalette.primary}
            </Text>
        </div>
    );
}
