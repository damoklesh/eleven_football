import {getAllArticles} from '@/lib/articles'; import SearchClient from '@/components/search-client'; export default function Search(){return <SearchClient articles={getAllArticles()}/>}
