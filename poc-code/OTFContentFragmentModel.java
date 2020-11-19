package com.otf.core.models;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;

import javax.annotation.PostConstruct;
import javax.inject.Inject;
import javax.inject.Named;
import javax.servlet.http.HttpServletRequest;

import org.apache.commons.lang3.StringUtils;
import org.apache.sling.api.SlingHttpServletRequest;
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
import org.apache.sling.settings.SlingSettingsService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.adobe.cq.dam.cfm.converter.ContentTypeConverter;
import com.adobe.cq.wcm.core.components.models.contentfragment.DAMContentFragment;
import com.adobe.cq.wcm.core.components.models.contentfragment.DAMContentFragment.DAMContentElement;
import com.day.cq.commons.Externalizer;
import com.drew.lang.annotations.NotNull;
import com.drew.lang.annotations.Nullable;

@Model(

		adaptables = { Resource.class, HttpServletRequest.class },

		resourceType = "otf/components/content/organism/mobile/contentFragment/otfMobilecontentfragment", defaultInjectionStrategy = DefaultInjectionStrategy.OPTIONAL)

@Exporter(name = "jackson", extensions = "json", options = {
		@ExporterOption(name = "MapperFeature.SORT_PROPERTIES_ALPHABETICALLY", value = "true"),
		@ExporterOption(name = "SerializationFeature.WRITE_DATES_AS_TIMESTAMPS", value = "false") })

public class OTFContentFragmentModel implements MobileContentModel{

	@ValueMapValue
	@Named("./variationName")
	private String variationName;

	@ValueMapValue
	@Named("./fragmentPath")
	@Default(values = "No Fragement chosen")
	private String fragmentPath;

	@Inject
	private ContentTypeConverter contentTypeConverter;

	@ValueMapValue(name = "elementNames", injectionStrategy = InjectionStrategy.OPTIONAL)
	private String[] elementNames;

	private DAMContentFragment damContentFragment = new EmptyContentFragment();

	@SlingObject
	@Required
	private ResourceResolver resourceResolver;

	@SlingObject
	private SlingHttpServletRequest request;

	@Inject
	private Externalizer externalizer;

	@Inject
	private SlingSettingsService slingSettingsService;

	@PostConstruct
	private void initModel() {
		if (StringUtils.isNotEmpty(fragmentPath)) {
			Resource fragmentResource = resourceResolver.getResource(fragmentPath);
			if (fragmentResource != null) {

				damContentFragment = new DAMContentFragmentImpl(fragmentResource, contentTypeConverter, variationName,
						elementNames);

			}
		}
	}

	public Map<Object,Object> getFragmentValues() {
		Map<Object, Object> valList = new HashMap<>();
		List<DAMContentElement> elements = damContentFragment.getElements();
		buildFragmentDetails(valList, elements);		
		return valList;

	}
	
	private Map<Object, Object> getFragmentValues(DAMContentFragment damContentFragment) {
		Map<Object, Object> valList = new HashMap<>();
		List<DAMContentElement> elements = damContentFragment.getElements();
		buildFragmentDetails(valList, elements);
		return valList;

	}

	private void buildFragmentDetails(Map<Object, Object> valList, List<DAMContentElement> elements) {
		Iterator<DAMContentElement> damFragmentItr = elements.iterator();
		valList.put("fragmentType", getFragmentType());
		List<Map<Object, Object>> childFragmentList = new ArrayList<>();
		while (damFragmentItr.hasNext()) {
			boolean isJsonElement = true;
			DAMContentElement damElement = damFragmentItr.next();
			if (damElement.isMultiValue()) {
				isJsonElement = false;
				String[] values = (String[]) damElement.getValue();
				for (String value : values) {
					if (isContentFragment(value)) {

						Map<Object, Object> childFragments = new HashMap<>();
						Resource fragmentResource = resourceResolver.getResource(value);
						if (fragmentResource != null) {

							DAMContentFragment damCF = new DAMContentFragmentImpl(fragmentResource,
									contentTypeConverter, variationName, elementNames);
							childFragments.put("contentType",getFragmentType(damCF));
							childFragments.putAll(getFragmentValues(damCF));
							childFragmentList.add(childFragments);

						}

					}

				}
				valList.put("content", childFragmentList);

			}
			else {
				
				if(damElement.getValue() != null&& (isContentFragment(damElement.getValue().toString()))) {
					isJsonElement = false;
					Map<Object, Object> childFragments = new HashMap<>();
					Resource fragmentResource = resourceResolver.getResource(damElement.getValue().toString());
					if (fragmentResource != null) {

						DAMContentFragment damCF = new DAMContentFragmentImpl(fragmentResource,
								contentTypeConverter, variationName, elementNames);
						childFragments.put("contentType",getFragmentType(damCF));
						childFragments.putAll(getFragmentValues(damCF));
						valList.put(damElement.getName(), childFragments);
					}
				}
			}
			if (isJsonElement) {
				getDamElementDetails(valList, damElement);
				
			}

		}
	}

	

	private boolean isContentFragment(String value) {
		boolean isCF = false;
		if (value.contains("/content/dam/otf/en_us/mobile/")) {
			isCF = true;
		}
		return isCF;
	}

	private void getDamElementDetails(Map<Object, Object> valList, DAMContentElement damElement) {
		Object value = damElement.getValue();
		if (damElement.getValue() != null && isLinkProperty(damElement.getValue().toString())) {

			value = externalizeURL(damElement.getValue().toString());

		}
		valList.put(damElement.getName(), value);
	}

	private String getFragmentType() {
		String fullType = damContentFragment.getType();
		return fullType.substring(fullType.lastIndexOf('/') + 1, fullType.length());

	}
	private String getFragmentType(DAMContentFragment damContentFragment) {
		String fullType = damContentFragment.getType();
		return fullType.substring(fullType.lastIndexOf('/') + 1, fullType.length());

	}

	public boolean isLinkProperty(String value) {
		boolean isLinkProperty = false;
		if (value.contains("/content/")) {
			isLinkProperty = true;
		}
		return isLinkProperty;
	}

	private String externalizeURL(String path) {
		String url;

		if (StringUtils.contains(path, "/content/dam")) {
			url = externalizer.absoluteLink(request, "https", path);
		} else {

			if (slingSettingsService.getRunModes().contains("publish")) {
				url = externalizer.publishLink(resourceResolver, path);
			} else {
				url = externalizer.authorLink(resourceResolver, path);
			}

		}

		return url;
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
		public @Nullable List<DAMContentElement> getElements() {
			return Collections.emptyList();
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
			return Collections.emptyList();
		}
	}
}
