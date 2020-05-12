package com.aemdemo.core.models;

import java.util.LinkedHashMap;
import java.util.Map;

import javax.inject.Named;

import org.apache.sling.api.SlingHttpServletRequest;
import org.apache.sling.api.resource.Resource;
import org.apache.sling.api.resource.ResourceResolver;
import org.apache.sling.models.annotations.DefaultInjectionStrategy;
import org.apache.sling.models.annotations.Exporter;
import org.apache.sling.models.annotations.ExporterOption;
import org.apache.sling.models.annotations.Model;
import org.apache.sling.models.annotations.Required;
import org.apache.sling.models.annotations.injectorspecific.OSGiService;
import org.apache.sling.models.annotations.injectorspecific.Self;
import org.apache.sling.models.annotations.injectorspecific.SlingObject;
import org.apache.sling.models.annotations.injectorspecific.ValueMapValue;
import org.apache.sling.models.factory.ModelFactory;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.adobe.cq.export.json.ComponentExporter;
import com.adobe.cq.export.json.SlingModelFilter;
import com.drew.lang.annotations.NotNull;

//import lombok.Data;

//@Data
@Model(

		adaptables = { SlingHttpServletRequest.class },

		resourceType = "aemdemo/components/page123", defaultInjectionStrategy = DefaultInjectionStrategy.OPTIONAL)

@Exporter(name = "jackson", extensions = "json", options = {
		@ExporterOption(name = "MapperFeature.SORT_PROPERTIES_ALPHABETICALLY", value = "true"),
		@ExporterOption(name = "SerializationFeature.WRITE_DATES_AS_TIMESTAMPS", value = "false") })

public class MobileContentRequestModelExporter {

	private static final Logger LOGGER = LoggerFactory.getLogger(MobileContentRequestModelExporter.class);

	@SlingObject
	@Required
	private ResourceResolver resourceResolver;

	@Self
	private Resource resource;

	@OSGiService
	private ModelFactory modelFactory;

	@Self
	private SlingHttpServletRequest request;

	private Map<String, ComponentExporter> childModels = null;

	@OSGiService
	private SlingModelFilter slingModelFilter;

	@ValueMapValue
	@Named("jcr:title")
	@Required
	private String title;

	public String getTitle() {
		return title;
	}

	public Map<String, ? extends ComponentExporter> getExportedItems() {
		if (childModels == null) {
			childModels = getItemModels(request, ComponentExporter.class);
		}

		return childModels;
	}

	private <T> Map<String, T> getItemModels(@NotNull SlingHttpServletRequest slingRequest,
			@NotNull Class<T> modelClass) {
		Map<String, T> itemWrappers = new LinkedHashMap<>();

		Iterable<Resource> iterable = slingModelFilter.filterChildResources(request.getResource().getChildren());

		if (iterable == null) {
			return itemWrappers;
		}

		for (final Resource child : iterable) {
			itemWrappers.put(child.getName(), modelFactory.getModelFromWrappedRequest(slingRequest, child, modelClass));
		}

		return itemWrappers;
	}

}
