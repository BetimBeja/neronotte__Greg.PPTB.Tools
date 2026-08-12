/**
 * Static sample data for the non-functional preview. Mirrors the shape of the
 * out-of-the-box `account` sample records so the preview reads like a real app
 * (docs/REQUIREMENTS.md, Main Panel).
 */

export interface SampleAccount {
    id: string;
    name: string;
    mainPhone: string;
    city: string;
    primaryContact: string;
    email: string;
}

export const SAMPLE_ACCOUNTS: SampleAccount[] = [
    { id: '1', name: 'A. Datum Corporation (sample)', mainPhone: '555-0158', city: 'Redmond', primaryContact: 'Rene Valdes (sample)', email: 'someone_i@example.com' },
    { id: '2', name: 'Adventure Works (sample)', mainPhone: '555-0152', city: 'Santa Cruz', primaryContact: 'Nancy Anderson (sample)', email: 'someone_c@example.com' },
    { id: '3', name: 'Alpine Ski House (sample)', mainPhone: '555-0157', city: 'Missoula', primaryContact: 'Paul Cannon (sample)', email: 'someone_h@example.com' },
    { id: '4', name: 'Blue Yonder Airlines (sample)', mainPhone: '555-0154', city: 'Los Angeles', primaryContact: 'Sidney Higa (sample)', email: 'someone_e@example.com' },
    { id: '5', name: 'City Power & Light (sample)', mainPhone: '555-0155', city: 'Redmond', primaryContact: 'Scott Konersmann (sample)', email: 'someone_f@example.com' },
    { id: '6', name: 'Coho Winery (sample)', mainPhone: '555-0159', city: 'Phoenix', primaryContact: 'Jim Glynn (sample)', email: 'someone_j@example.com' },
    { id: '7', name: 'Contoso Pharmaceuticals (sample)', mainPhone: '555-0156', city: 'Redmond', primaryContact: 'Robert Lyon (sample)', email: 'someone_g@example.com' },
    { id: '8', name: 'Fabrikam, Inc. (sample)', mainPhone: '555-0153', city: 'Lynnwood', primaryContact: 'Maria Campbell (sample)', email: 'someone_d@example.com' },
];

/** Views offered by the sample view selector. */
export const SAMPLE_VIEWS = ['My Active Accounts', 'All Accounts', 'Accounts: Influenced Deals That We Won', 'Active Accounts', 'Inactive Accounts'] as const;
