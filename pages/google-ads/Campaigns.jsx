import GoogleAdsResourceManager from '../../components/google-ads/GoogleAdsResourceManager.jsx'
import CampaignCreationWizard from '../../components/google-ads/CampaignCreationWizard.jsx'
export default function Campaigns() { return <GoogleAdsResourceManager kind="campaigns" CreateForm={CampaignCreationWizard} /> }
