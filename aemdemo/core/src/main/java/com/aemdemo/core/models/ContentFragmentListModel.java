package com.aemdemo.core.models;

import static com.day.cq.dam.api.DamConstants.NT_DAM_ASSET;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import javax.annotation.PostConstruct;
import javax.inject.Inject;
import javax.inject.Named;
import javax.jcr.Session;

import org.apache.commons.lang3.StringUtils;
import org.apache.sling.api.resource.Resource;
import org.apache.sling.api.resource.ResourceResolver;
import org.apache.sling.models.annotations.Default;
import org.apache.sling.models.annotations.DefaultInjectionStrategy;
import org.apache.sling.models.annotations.Exporter;
import org.apache.sling.models.annotations.ExporterOption;
import org.apache.sling.models.annotations.Model;
import org.apache.sling.models.annotations.Required;
import org.apache.sling.models.annotations.injectorspecific.InjectionStrategy;
import org.apache.sling.models.annotations.injectorspecific.SlingObject;
import org.apache.sling.models.annotations.injectorspecific.ValueMapValue;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.adobe.cq.dam.cfm.converter.ContentTypeConverter;
import com.adobe.cq.wcm.core.components.internal.models.v1.contentfragment.DAMContentFragmentImpl;
import com.adobe.cq.wcm.core.components.models.contentfragment.ContentFragmentList;
import com.adobe.cq.wcm.core.components.models.contentfragment.DAMContentFragment;
import com.adobe.cq.wcm.core.components.models.contentfragment.DAMContentFragment.DAMContentElement;
import com.day.cq.commons.jcr.JcrConstants;
import com.day.cq.search.PredicateGroup;
import com.day.cq.search.Query;
import com.day.cq.search.QueryBuilder;
import com.day.cq.search.result.SearchResult;
import com.day.cq.tagging.TagConstants;
import com.drew.lang.annotations.NotNull;
import com.drew.lang.annotations.Nullable;

//import lombok.Data;

//@Data
@Model(

		adaptables = { Resource.class },

		resourceType = "aemdemo/components/contentfragmentlist", defaultInjectionStrategy = DefaultInjectionStrategy.OPTIONAL)

@Exporter(name = "jackson", extensions = "json", options = {
		@ExporterOption(name = "MapperFeature.SORT_PROPERTIES_ALPHABETICALLY", value = "true"),
		@ExporterOption(name = "SerializationFeature.WRITE_DATES_AS_TIMESTAMPS", value = "false") })

public class ContentFragmentListModel {

	private static final Logger LOGGER = LoggerFactory.getLogger(ContentFragmentListModel.class);
	public static final String DEFAULT_DAM_PARENT_PATH = "/content/dam";

	public static final int DEFAULT_MAX_ITEMS = -1;

	@ValueMapValue(name = ContentFragmentList.PN_MAX_ITEMS, injectionStrategy = InjectionStrategy.OPTIONAL)
	@Default(intValues = DEFAULT_MAX_ITEMS)
	private int maxItems;
    private List<DAMContentFragment> items = new ArrayList<>();

	@ValueMapValue
	@Named("./variationName")
	//@Required
	private String variationName;

	@ValueMapValue
	@Named("./parentPath")
	@Default(values = "No Fragement chosen")
	private String parentPath;

	@ValueMapValue
	@Named("./modelPath")
	@Default(values = "No Model chosen")
	private String modelPath;
	
	@ValueMapValue
	@Named("./orderBy")
	@Default(values = "No Order by criteria chosen")
	private String orderBy;
	
	@ValueMapValue
	@Named("./sortOrder")
	@Default(values = "No Sort order chosen chosen")
	private String sortOrder;
	
	@ValueMapValue
	@Named("./tagNames")
	@Default(values = "No tag names given")
	private String[] tagNames;
	

	@Inject
	private ContentTypeConverter contentTypeConverter;

	@ValueMapValue(name = "elementNames", injectionStrategy = InjectionStrategy.OPTIONAL)
	private String[] elementNames;

	//private String type;
	//private DAMContentFragment damContentFragment = new EmptyContentFragment();

	@SlingObject
	@Required
	private ResourceResolver resourceResolver;

	@PostConstruct
	private void initModel() {
		// Default path limits search to DAM
		if (StringUtils.isEmpty(parentPath)) {
			parentPath = DEFAULT_DAM_PARENT_PATH;
		}

		if (StringUtils.isEmpty(modelPath)) {
			LOGGER.warn("Please provide a model path");
			return;
		}

		Session session = resourceResolver.adaptTo(Session.class);
		if (session == null) {
			LOGGER.warn("Session was null therefore no query was executed");
			return;
		}

		QueryBuilder queryBuilder = resourceResolver.adaptTo(QueryBuilder.class);
		if (queryBuilder == null) {
			LOGGER.warn("Query builder was null therefore no query was executed");
			return;
		}

		Map<String, String> queryParameterMap = new HashMap<>();
		queryParameterMap.put("path", parentPath);
		queryParameterMap.put("type", NT_DAM_ASSET);
		queryParameterMap.put("p.limit", Integer.toString(maxItems));
		queryParameterMap.put("1_property", JcrConstants.JCR_CONTENT + "/data/cq:model");
		queryParameterMap.put("1_property.value", modelPath);

		if (StringUtils.isNotEmpty(orderBy)) {
			queryParameterMap.put("orderby", "@" + orderBy);
			if (StringUtils.isNotEmpty(sortOrder)) {
				queryParameterMap.put("orderby.sort", sortOrder);
			}
		}

		ArrayList<String> allTags = new ArrayList<>();
		if (tagNames != null && tagNames.length > 0) {
			allTags.addAll(Arrays.asList(tagNames));
		}

		if (!allTags.isEmpty()) {
			// Check for the taggable mixin
			queryParameterMap.put("2_property", JcrConstants.JCR_CONTENT + "/metadata/" + JcrConstants.JCR_MIXINTYPES);
			queryParameterMap.put("2_property.value", TagConstants.NT_TAGGABLE);
			// Check for the actual tags (by default, tag are or'ed)
			queryParameterMap.put("tagid.property", JcrConstants.JCR_CONTENT + "/metadata/cq:tags");
			for (int i = 0; i < allTags.size(); i++) {
				queryParameterMap.put(String.format("tagid.%d_value", i + 1), allTags.get(i));
			}
		}

		PredicateGroup predicateGroup = PredicateGroup.create(queryParameterMap);
		Query query = queryBuilder.createQuery(predicateGroup, session);

		SearchResult searchResult = query.getResult();

		LOGGER.debug("Query statement: '{}'", searchResult.getQueryStatement());

		// Query builder has a leaking resource resolver, so the following work around
		// is required.
		ResourceResolver leakingResourceResolver = null;
		try {
			// Iterate over the hits if you need special information
			Iterator<Resource> resourceIterator = searchResult.getResources();
			while (resourceIterator.hasNext()) {
				Resource resource = resourceIterator.next();
				if (leakingResourceResolver == null) {
					// Get a reference to QB's leaking resource resolver
					leakingResourceResolver = resource.getResourceResolver();
				}

				DAMContentFragment contentFragmentModel = new DAMContentFragmentImpl(resource, contentTypeConverter,
						null, elementNames);

				items.add(contentFragmentModel);
			}
		} finally {
			if (leakingResourceResolver != null) {
				// Always close the leaking query builder resource resolver
				leakingResourceResolver.close();
			}
		}
	}

//	public Map<Object, Object> getFragmentValues() {
//		return this.damContentFragment.getElements().stream()
//				.collect(Collectors.toMap(DAMContentElement::getName, DAMContentElement::getValue));
//	}
	
	public List<Map<Object,Object>> getFragmentList()
	{
		List<Map<Object,Object>> fragPropList = new ArrayList<>();
		this.items.forEach(frag -> {
			Map<Object,Object> propList = frag.getElements().stream().collect(
	                Collectors.toMap(DAMContentElement::getName, DAMContentElement::getValue));
			LOGGER.info("--------------------- "+propList);
			fragPropList.add(propList) ;
		});
		return fragPropList;
	}
	


	/**
	 * Empty placeholder content fragment.
	 */
	private static class EmptyContentFragment implements DAMContentFragment {
		@Override
		public @Nullable String getTitle() {
			return null;
		}

		@Override
		public @Nullable String getDescription() {
			return null;
		}

		@Override
		public @Nullable String getType() {
			return null;
		}

		@Override
		public @Nullable String getName() {
			return null;
		}

		@Override
		public @Nullable List<DAMContentElement> getElements() {
			return null;
		}

		@Override
		public @NotNull Map<String, DAMContentElement> getExportedElements() {
			return new HashMap<>();
		}

		@Override
		public @NotNull String[] getExportedElementsOrder() {
			return new String[0];
		}

		@Override
		public @Nullable List<Resource> getAssociatedContent() {
			return null;
		}
	}
}
