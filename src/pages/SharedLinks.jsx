import ShareActivity from '../components/ShareActivity.jsx';

function SharedLinks() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">Shared Links & Activity</h1>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400 sm:text-base">Track and manage your shared document access activity</p>
            </div>

            <ShareActivity />
        </div>
    );
}

export default SharedLinks;
